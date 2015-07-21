/*global speechSynthesis, SpeechSynthesisUtterance*/
/*jslint vars:true, browser:true, devel:true*/
(function () {'use strict';

var li, container, a;

function insertLi () {
    var innerbodycontent = document.getElementById('innerbodycontent');
    innerbodycontent.insertBefore(li, innerbodycontent.firstElementChild);
    li.nextElementSibling.style.clear = 'right';
}
function buildSSContainer() {
    // Start form
    li = document.createElement('li');
    container = document.createElement('div');
    container.style.marginLeft = '37px';
    container.style.marginRight = '68px';
    container.style.display = 'none';
    a = document.createElement('a');
    a.href = '#';
    a.style.float = 'right';

    a.appendChild(document.createTextNode('Speech synthesis'));
    li.appendChild(a);
    li.appendChild(container);
    // a.style.backgroundColor = 'lightblue'; // '#1057A7';

    li.style.float = 'right';
    li.style.width = '100%';
    li.style.marginBottom = '17px';
    li.style.marginTop = '-10px';

    li.style.listStyleType = 'none';
    a.style.height = '12px';
    a.addEventListener('click', function (e) { // Toggle
        var style = li.firstChild.nextElementSibling.style;
        style.display = style.display === 'none' ? 'block' : 'none';
        e.stopPropagation();
        e.preventDefault();
    });
}

if (!window.SpeechSynthesisUtterance) {
    buildSSContainer();
    container.style.fontStyle = 'italic';
    container.style.marginTop = '25px';
    container.innerHTML = 'Currently, this feature is only supported in <a href="http://caniuse.com/#search=speech">certain browsers</a>. You may wish to use such a browser which can support it (e.g., Chrome).';
    insertLi();
}
else {
/*
Other properties/events:
speechSynthesis properties: pending, speaking, paused
msg events: onstart, onend, onerror, onpause, onresume, onmark, onboundary
where the event has charIndex, elapsedTime, name
*/

/**
 * Chunkify
 * Google Chrome Speech Synthesis Chunking Pattern
 * Fixes inconsistencies with speaking long texts in speechUtterance objects 
 * Licensed under the MIT License
 *
 * Peter Woolley and Brett Zamir
 */
 
var speechUtteranceChunker = function (utt, settings, callback) {
    settings = settings || {};
    var newUtt;
    var txt = (settings && settings.offset !== undefined ? utt.text.substring(settings.offset) : utt.text);
    if (utt.voice && utt.voice.voiceURI === 'native') { // Not part of the spec
        newUtt = utt;
        newUtt.text = txt;
        newUtt.addEventListener('end', function () {
            if (speechUtteranceChunker.cancel) {
                speechUtteranceChunker.cancel = false;
            }
            if (callback !== undefined) {
                callback();
            }
        });
    }
    else {
        var chunkLength = (settings && settings.chunkLength) || 160;
        var pattRegex = new RegExp('^[\\s\\S]{' + Math.floor(chunkLength / 2) + ',' + chunkLength + '}[.!?,]{1}|^[\\s\\S]{1,' + chunkLength + '}$|^[\\s\\S]{1,' + chunkLength + '} ');
        var chunkArr = txt.match(pattRegex);
 
        if (chunkArr[0] === undefined || chunkArr[0].length <= 2) {
            //call once all text has been spoken...
            if (callback !== undefined) {
                callback();
            }
            return;
        }
        var chunk = chunkArr[0];
        newUtt = new SpeechSynthesisUtterance(chunk);
        var x;
        for (x in utt) {
            if (// utt.hasOwnProperty(x) && 
                x !== 'text') {
                newUtt[x] = utt[x];
            }
        }
        newUtt.addEventListener('end', function () {
            if (speechUtteranceChunker.cancel) {
                speechUtteranceChunker.cancel = false;
                return;
            }
            settings.offset = settings.offset || 0;
            settings.offset += chunk.length - 1;
            speechUtteranceChunker(utt, settings, callback);
        });
    }
 
    if (settings.modifier) {
        settings.modifier(newUtt);
    }
    console.log(newUtt); //IMPORTANT!! Do not remove: Logging the object out fixes some onend firing issues.
    //placing the speak invocation inside a callback fixes ordering and onend issues.
    setTimeout(function () {
        speechSynthesis.speak(newUtt);
    }, 0);
};

// Need an interval till ready per https://code.google.com/p/chromium/issues/detail?id=340160
var speechPrefix = 'speechsynthesis-';

var watch = setInterval(function() {

var voices = speechSynthesis.getVoices();

if (!voices.length) {
    return;
}
clearInterval(watch);


buildSSContainer();

// Voice choices
var select = document.createElement('select');
select.style.width = '379px';
select.addEventListener('click', function (e) {
    var target = e.target;
    document.getElementById(speechPrefix + 'lang').value = target.options[target.selectedIndex].dataset.lang;
});

container.appendChild(document.createElement('br'));
var voicesLabel = document.createElement('label');
voicesLabel.innerHTML = '<b>Voice</b> ';
voicesLabel.appendChild(select);
container.appendChild(voicesLabel);

voices.forEach(function(voice, i) { // voiceURI, name, lang, localService, default
    var option = document.createElement('option');
    option.value = i;
    if (i === 1) {
        option.selected = 'selected';
    }
    option.dataset.lang = voice.lang || 'en-US';
    option.dataset.voiceuri = voice.voiceURI;
    option.text = voice.name + ['default', 'localService'].reduce(function (str, boolProperty) {
        return str + (voice[boolProperty] ? ' (' + boolProperty + ')' : '');
    }, '') + ['lang', 'voiceURI'].reduce(function (str, stringProperty) {
        var val = voice[stringProperty];
        return str + (val && val !== voice.name ? ' (' + stringProperty + ': ' + val + ')' : '');
    }, '');
    select.appendChild(option);
});
container.appendChild(document.createElement('br'));

var controls = document.createElement('label');
controls.innerHTML = '<b>Controls</b> &nbsp;';
container.appendChild(controls);

// Numeric
[['volume', 0, 1, 1], ['rate', 0.1, 10, 0.8], ['pitch', 0, 2, 1]].forEach(function (inputInfo) {
    var inputType = inputInfo[0];
    var label = document.createElement('label');
    label.appendChild(document.createTextNode(inputType));
    var input = document.createElement('input');
    input.id = speechPrefix + inputType;
    input.type = 'number';
    input.step = 0.1;
    input.min = inputInfo[1];
    input.max = inputInfo[2];
    input.value = inputInfo[3];
    label.appendChild(input);
    container.appendChild(label);
});

/*
// Working: use if want language code to be configurable semi-independent of voices
[
    ['lang', 'Language Code', 'en-US']
    //, ['voiceURI', 'Voice URI', 'native']
].forEach(function (inputInfo) {
    var inputType = inputInfo[0];
    var inputText = inputInfo[1];
    var defaultValue = inputInfo[2];
    var label = document.createElement('label');
    label.appendChild(document.createTextNode(inputText));
    var input = document.createElement('input');
    input.id = speechPrefix + inputType;
    input.value = defaultValue;
    input.placeholder = defaultValue;
    label.appendChild(input);
    container.appendChild(label);
});
*/
[
    ['lang', 'en-US', 'Language Code']
].forEach(function (inputInfo) {
    var inputType = inputInfo[0];
    var defaultValue = inputInfo[1];
    var input = document.createElement('input');
    input.type = 'hidden';
    input.id = speechPrefix + inputType;
    input.value = defaultValue;
    container.appendChild(input);
});


document.getElementById('ws-data').style.speak = 'normal'; // Being set to none for some reason; interfering apparently
var sliderContainer = document.createElement('div');

var getContent = function () {
    var mct = document.getElementById('mw-content-text').cloneNode(true);
    [].slice.call(mct.querySelectorAll('#ws-data,#headertemplate,.opage,.parNum')).forEach(function (el) { // Ignore header template-added elements and page/par. numbers
        el.parentNode.removeChild(el);
    });
    return mct.textContent;
};

var getSelectionOrContent = function () {
    return String(window.getSelection()) || getContent();
};

var updateSlider = function (text, initialValue) {
    var len = text.length;
    var oldSlider = document.getElementById(speechPrefix + 'slider');
    if (oldSlider && oldSlider.max === String(len)) {
        return;
    }
    var label = document.createElement('label');
    label.appendChild(document.createTextNode('Initial position'));
    var slider = document.createElement('input');
    slider.id = speechPrefix + 'slider';
    slider.type = 'range';
    slider.step = String(len/100);
    slider.min = '0';
    slider.max = String(len);
    slider.value = String(initialValue || 0);
    if (oldSlider) {
        oldSlider.parentNode.replaceChild(slider, oldSlider);
    }
    else {
        label.appendChild(slider);
        sliderContainer.appendChild(label);
    }
};

var toggleStyles = function (addStylesType) {
    var button = document.getElementById(speechPrefix + 'play');
    button.textContent = ['start', 'resume'].indexOf(addStylesType) > -1 ? 'Pause' : 'Play';
    if (addStylesType === 'pause') {
        button.style.backgroundColor = 'red';
    }
    else {
        button.style.backgroundColor = '';
    }
};

// Events
var speak = function (txt) {
    var msg = new SpeechSynthesisUtterance();

    msg.voice = voices[select.value]; // Note: some voices don't support altering params // Todo: no voice in spec and using voiceURI does not work!
    // msg.voiceURI = select.selectedOptions[0].dataset.voiceuri;

    ['lang'].forEach(function (property) {
        msg[property] = document.getElementById(speechPrefix + property).value;
    });
    ['volume', 'rate', 'pitch'].forEach(function (property) {
        msg[property] = parseFloat(document.getElementById(speechPrefix + property).value);
    });
    var text = txt || getSelectionOrContent();
    var slider = document.getElementById(speechPrefix + 'slider');
    var sliderVal = slider && slider.value;
    msg.text = sliderVal ? text.slice(sliderVal) : text;
    
    
    speechSynthesis.cancel();
    
    msg = speechUtteranceChunker(msg, {
        chunkLength: 200,
        modifier: function (msg) {
            // msg.onstart, onend, onerror, onpause, onresume, onmark, onboundary
            // speechSynthesis properties: pending, speaking, paused

            // boundary event apparently not working in chrome
            // Also, there are no properties that can be queried to find the
            //   current charIndex position, so no use with an interval like
            //   the following now
            // var advanceSlider = setInterval(function () {}, 60);
            ['start', 'end', 'pause', 'resume'].forEach(function (eventType) {
                msg.addEventListener(eventType, (function (eventType) {
                    return function () {
                        toggleStyles(eventType);
                    };
                }(eventType)));
            });
                
            /*
            // Keeps resetting the slider and does not set it in the middle
            msg.addEventListener('boundary', function (e) { // The event doesn't go every character, so we increment at boundaries.
                var slider = document.getElementById(speechPrefix + 'slider');
                slider.value = e.charIndex;
            });
            */
            msg.addEventListener('error', function (e) {
                var span = document.createElement('span');
                span.style.color = 'red';
                span.appendChild(document.createTextNode(e));
                container.appendChild(span);
                setTimeout(function () {
                    container.removeChild(span);
                }, 5000);
            });
        }
    }, function () {
        // Some code to execute when done
    });
};

sliderContainer.style.float = 'right';
sliderContainer.style.marginTop = '-25px';

updateSlider(getContent());
container.appendChild(sliderContainer);

// container.appendChild(document.createElement('br'));
['play', 'cancel'].forEach(function (buttonType) {
    var button = document.createElement('button');
    button.id = speechPrefix + buttonType;
    
    button.addEventListener('click', buttonType === 'play' ? function () {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
        }
        else if (speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
        else {
            speak();
        }
    } : (function (buttonType) {
        return function () {
            if (speechSynthesis.paused) { // We have to resume and then cancel
                speechSynthesis.resume();
            }
            speechUtteranceChunker.cancel = true;
            speechSynthesis[buttonType]();
        };
    }(buttonType)));
    button.appendChild(document.createTextNode(buttonType.charAt(0).toUpperCase() + buttonType.slice(1)));
    sliderContainer.appendChild(button);
});

document.body.addEventListener('mouseup', function () {
    updateSlider(getSelectionOrContent()); // Make sure updated for next time
});


//document.getElementById('ca-unwatch').parentNode.appendChild(li);
// document.getElementById('gumax-nav').appendChild(li);

insertLi();

var locationHashChanged = function () {
    var play = location.hash.match(/^#play-(.*)$/);
    if (play) {
        var elem = document.getElementById(play[1]);
        elem.scrollIntoView();
        var range = document.createRange();
        range.setStartBefore(elem);
        range.setEndAfter(document.body.lastChild);
        var postIDText = range.cloneContents().textContent;
        if (postIDText) {
            speak(postIDText);
        }
    }
    else {
        document.getElementById(location.hash.slice(1)).scrollIntoView();
    }
};
if ('onhashchange' in window) {
    window.onhashchange = locationHashChanged;
}

if (location.hash) {
    locationHashChanged();
}

}, 1);

}

}());
