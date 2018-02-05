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

var recordNow = false;

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

// manage the jquery for note playing/stopping/clickint/etc
function noteBindings() {
    var mouseDown = false;
    var keydownCount = 0;

    function activeAndplayNote(position, note, velocity=127, delay=0) {
        if (noteInScale(adjustNoteToOneScale(note))) {
            position.addClass('active');
            MIDI.noteOn(0, note, velocity, delay);
        }
    }

    function inactiveAndStopNote(position, note, delay=0.15) {
        position.removeClass('active');
        MIDI.noteOff(0, note, delay);
    }

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
    $('.playback').click(function() {
        if (recordNow) {
            $('#record').html('&#9658;');
        } else {
            $('#record').html('&#10074; &#10074;');
        }
        recordNow = !recordNow;
    });
}
