var mouseDown = false;
var keyboardMap = {
    // jquery_code: MIDI_note, // keyboard_char
    50: 36, // 2
    51: 37, // 3
    52: 38, // 4
    53: 39, // 5
    54: 40, // 6
    55: 41, // 7
    87: 43, // w
    69: 44, // e
    82: 45, // r
    84: 46, // t
    89: 47, // y
    85: 48, // u
    83: 50, // s
    68: 51, // d
    70: 52, // f
    71: 53, // g
    72: 54, // h
    74: 55, // j
    88: 57, // x
    67: 58, // c
    86: 59, // v
    66: 60, // b
    78: 61, // n
    77: 62  // m
 };
var scales = {
    chromatic: [1,1,1,1,1,1,1,1,1,1,1,1], // lol
    major: [2,2,1,2,2,2,1],
    minor: [2,1,2,2,1,2,2],
    minorPent: [3,2,2,3,2]
};
var currentScale = getNotesForScale(36, scales.chromatic);

var recordNow = false, playbackNow = false, loop = false;
var loadedRec = "pachobel";
var recordings = {
    rawRec: [],
    rec: [],
    enhancedRec: [],
    pachobel: [
[48, 1742, 0],
[43, 1742, 0],
[45, 1742, 0],
[40, 1742, 0],
[41, 1742, 0],
[36, 1742, 0],
[41, 1742, 0],
[43, 1742, 0]
],
    C: [[60, 2000, 0]]
}

// master function - call to initialize
function celloUI(){
    scaleSelectorBindings();
    noteBindings();
    playback();
}

function noteInScale(note) {
    return currentScale.includes(note);
}

function adjustNoteToOneScale(note) {
    var tonic = currentScale[0];
    if (note < tonic) {
        return note + 12;
    } else if (note >= tonic+24) {
        return note - 24;
    } else if (note >= tonic+12) {
        return note - 12;
    } else {
        return note;
    }
}

// given a tonic and a scale will return notes of that scale.
function getNotesForScale(note, scaleKey) {
    var scaleNotes = [note];
    for (var i=0;i<scaleKey.length;i++){
        note += scaleKey[i];
        scaleNotes.push(note);
    }
    return scaleNotes;
}

function activeAndplayNote(position, note, velocity=127, delay=0) {
    if (noteInScale(adjustNoteToOneScale(note))) {
        position.addClass('active');
        MIDI.noteOn(0, note, velocity, delay);
        if (recordNow) recordings.rawRec.push([note, Date.now()]);
    }
}

function inactiveAndStopNote(position, note, delay=0.15) {
    position.removeClass('active');
    MIDI.noteOff(0, note, delay);
    if (recordNow && mouseDown) {
        var temp = recordings.rawRec.pop();
        temp.push(Date.now());
        recordings.rawRec.push(temp);
    }
}

// manage the jquery for note playing/stopping/clickint/etc
function noteBindings() {
    var keydownCount = 0;

    // tracks when the mouse is pressed down.
    $(document).mousedown(function() {
        mouseDown = true;
    }).mouseup(function() {
        mouseDown = false;
    });

    // tracks the keyboard to play notes.
    $(document).keydown(function(e) {
        var codeToNote = keyboardMap[e.which];
        if (codeToNote && keydownCount === 0) {
            keydownCount++;
            activeAndplayNote($('#'+codeToNote), codeToNote)
        }
    }).keyup(function(e) {
        keydownCount = 0;
        var codeToNote = keyboardMap[e.which];
        if (codeToNote) inactiveAndStopNote($('#'+codeToNote), codeToNote);
    });

    // tracks the mouse to play notes.
    $('.position').each(function(){
        var delay = 0; // play one note every quarter second
        var note = parseInt(this.id); // the MIDI note
        var velocity = 127; // how hard the note hits
        MIDI.setVolume(0, 127);

        $(this).mousedown(function() {
            activeAndplayNote($(this), note, velocity, delay);
        });

        $(this).on('mouseover', function() {
            if (mouseDown) activeAndplayNote($(this), note, velocity, delay);
        }).on('mouseout mouseup', function() {
            inactiveAndStopNote($(this), note, delay);
        });
    });
}

// manage the jquery for filtering cello by scale.
function scaleSelectorBindings() {
    $('.scale-selector').each(function() {
        $(this).click(function() {
            $('.scale-selector').removeClass('active-scale');
            $(this).addClass('active-scale');

            currentScale = getNotesForScale(parseInt($(this).attr('note')), scales[this.id]);

            $('.position').each(function() {
                var inScale = noteInScale(adjustNoteToOneScale(parseInt(this.id)));
                $(this).removeClass('not-in-scale').toggleClass('not-in-scale', !inScale);
            });
        });
    });
}

function playback() {
    $('#record-btn').click(function() {
        if (recordNow) {
            recordNow = false;
            $('#record').html('Record &#9899;');
            compileRec();
        } else {
            recordNow = true;
            recordings.rawRec = [];
            $('#record').html('Stop Record &#10074; &#10074;');
        }
    });

    $('#playback-btn').click(function() {
        if (!playbackNow) {
            playbackNow = true;
            $('#playback').html('Stop Playback &#10074; &#10074;');
            playRecording(recordings[loadedRec].slice(0));
        } else {
            playbackNow = false;
            $('#playback').html('Playback &#9658;');
        }
    });

    $('#loop-btn').click(function() {
        loop = !loop;
        $('#loop').html((loop ?'':'Not ')+'Looping');
    });

// // uses while loop for timer - not async :-(
//   function playRecording(notes) {
//         var note, duration, loopTime;
        
//         for (var i=0;i<notes.length;i++) {
//             note = notes[i][0];
//             duration = notes[i][1];

//             MIDI.noteOn(0, note, 127, 0);

//             loopTime = Date.now();
//             while ( (Date.now()-loopTime < duration) );

//             MIDI.noteOff(0, note, 0.1);
//             if (!playbackNow) break;
//         }
//         if (playbackNow) playRecording(notes);
//     }

    // using setTimeout - I think a while loop is simpler...
    function playRecording(notes) {
        if (!playbackNow) return;
        var data, note, delay, restBefore;

        data  = notes.shift();
        note = data[0];
        restBefore = data[2]/1000.00;
        delay = data[1] + data[2];

        MIDI.noteOn(0, note, 127, restBefore);
        setTimeout(function(){
            MIDI.noteOff(0, note, 0);

            if (notes.length) {
                playRecording(notes);
            } else {
                if (loop) {
                    setTimeout(function() {
                        playRecording(recordings[loadedRec].slice(0));
                    }, data[2]);
                } else {
                    $('#playback').html('Playback &#9658;');
                    playbackNow = false;
                }
            }
        }, delay);
    }

    function compileRec() {
        var data, duration, restBefore;

        recordings.rec = [];

        for (var i=0;i<recordings.rawRec.length;i++) {
            data = recordings.rawRec[i];
            duration = data[2] - data[1];
            restBefore = i===0 ? 0 : (data[1] - recordings.rawRec[i-1][2]);
            recordings.rec.push([data[0], duration, restBefore]);
        }
        enhanceTempo();

        loadedRec = 'rec';
        return recordings[loadedRec];
    }

    function enhanceTempo() {
        var tempos = [0, 0, 0, 0, 0]; // [0: 0, 1: 1/8, 2: 1/4, 3: 1/2, 4: 1/1]
        var data, duration, restBefore;

        recordings.enhancedRec = [];

        for (var i=0;i<recordings.rec.length;i++) {
            tempos[2] += recordings.rec[i][1];
        }
        tempos[2] /= (recordings.rec.length);
        tempos[3] = tempos[2]*2.0;
        tempos[4] = tempos[2]*4.0;
        tempos[1] = tempos[2]/2.0;

        for (var i=0;i<recordings.rec.length;i++) {
            data = recordings.rec[i];
            duration = getClosestTempo(tempos, data[1]);
            restBefore = getClosestTempo(tempos, (data[2]/2.0));
            recordings.enhancedRec[i] = [data[0], duration, restBefore];
        }
    }

    function getClosestTempo(tempos, rawDuration) {
        var closest=tempos[4];
        var _res, close;

        for (var tempo in tempos) {
            close=Math.abs(rawDuration-tempos[tempo]);

            if(close < closest){
                closest = close;
                _res=tempos[tempo];
            }
        }
        return _res;
    }
}

// console helper functions

function logLoadedRecord(record=loadedRec, showNotes=true) {
    console.log('Loaded Record: ' +record);
    if (showNotes) for (arr in recordings[record]) {
        console.log(recordings[record][arr]);
    }
    return record;
}

function loadRecord(recToLoad) {
    if (recToLoad in recordings) {
        loadedRec = recToLoad;
        console.log("Recording Loaded!");
    } else {
        console.log("Recording Not Loaded.");
    }
    return recordings[recToLoad];
}
