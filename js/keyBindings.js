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
    chromatic: 'chromatic',
    C: [36,38,40,41,43,45,47,48],
    Cmin: [36,38,39,41,43,44,46,48]
    // C: [2,2,1,2,2,2,1],
    // Cmin: [2,1,2,2,1,2,2]
};

function noteInScale(note) {
    var currentScale = scales[$('.active-scale').attr('id')];
    if (currentScale === 'chromatic') {
        return true;
    } else  {
        return currentScale.includes(note);
    }
}

function adjustNoteToOneScale(note) {
    if (note < 48) {
        return note;
    } else if (note >= 60) {
        return note - 24;
    } else {
        return note - 12;
    }
}

// function getNotesForScale(note, scaleKey) {
//     var scaleNotes = [note];
//     for (var i=0;i<7;i++){
//         note += scaleKey[i];
//         scaleNotes.push(note);
//     }
//     return scaleNotes;
// }

function celloUI(){
    scaleSelectorBindings();
    noteBindings();
}

function noteBindings() {
    var mouseDown = false;
    var keydownCount = 0;

    function activeAndplayNote(position, note, velocity=127, delay=0) {
        if (noteInScale(adjustNoteToOneScale(note))) {
            position.addClass('active');
            MIDI.noteOn(0, note, velocity, delay);
        }
    }

    function inactiveAndStopNote(position, note, delay=0) {
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

function scaleSelectorBindings() {
    $('.scale-selector').each(function() {
        $(this).click(function() {
            $('.scale-selector').removeClass('active-scale');
            $(this).addClass('active-scale');

            $('.position').each(function() {
                var inScale = noteInScale(adjustNoteToOneScale(parseInt(this.id)));
                $(this).removeClass('not-in-scale').toggleClass('not-in-scale', !inScale);
            });
        });
    });
}
