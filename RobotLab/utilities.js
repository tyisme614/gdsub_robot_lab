//this file includes all methods related for subtitle translating or processing
const rl = require('linebyline');
const fs = require('fs');

const projectID = 'GLocalizationProjects';
//google translate
//google cloud translate api
const google_translate = require('@google-cloud/translate');
const target_lang = 'zh';
const translator = new google_translate({
    projectId: projectID,
    keyFilename: '/home/yuan/auth/GLocalizationProjects-4f795dcb895a.json'
});

//patterns
//start time
const pattern_start_time = /^[0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]\,[0-9][0-9][0-9]/;
//end time
const pattern_end_time = /[0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]\,[0-9][0-9][0-9]$/;

var observer;

const EventEmitter = require('events');
class customEventEmitter extends EventEmitter{};
const stateEmitter = new customEventEmitter();
stateEmitter.on(1001, (token)=>{
    var task = tasks[token];

    console.log('traversing subtitle finished, start translating english line by line');
    task.sentence_index = 0;
    translate(token, task.sentence_block[task.sentence_index]);


    //debug
    //observer.emit(1000, blocks, sentence_block);
});

stateEmitter.on(1002, (token)=>{
    var task = tasks[token];
    task.sentence_index++;
    if(task.sentence_index < task.sentence_block.length){

        console.log('translate sentence block ' + task.sentence_index);
        translate(token, task.sentence_block[task.sentence_index]);
    }else{
        console.log('translation process completed, generating subtitle');
        if(observer != null){
            observer.emit(1003, token);
        }
    }

});

stateEmitter.on(1003, (token, file)=>{
   console.log('subtitle generated, file:' + file);
    if(observer != null){
        observer.emit(1004, token, file);
    }
});

var tasks = [];

// var blocks = [];
// var sentence_block = [];
// var sentence_index = 0;

exports.traverse = function(file, token, callback){


    var task = {};
    task.token = token;
    task.sentence_block = [];
    task.blocks = [];
    task.sentence_index = 0;
    tasks[token] = task;

    var sentence_block = task.sentence_block;
    var blocks = task.blocks;


    var linecount = 0;
    var blockcount = 0;

    var sentence_index = 0;
    var rl_en = rl(file);
    var sentence = '';
    var sub_index_arr = [];
    rl_en.on('line', function(line, lineCount, byteCount) {
        //debug
        //console.log('line:' + line);

        if(linecount == 0 && line != ''){
            //create new block
            /**
             * block object
             * line number
             * timestamp
             * start_time
             * end_time
             * subtitle
             * sentence index
             * issubtitle
             */

            var block = {};
            block.line_number = line;
            block.start_time = 0;
            block.end_time = 0;
            block.timestamp = '';
            block.subtitle = '';
            block.sentence = sentence_index;
            block.issubtitle = true;
            blocks.push(block);

            linecount++;


        }else if(linecount == 1){
            var block = blocks[blockcount];
            var start_time = line.match(pattern_start_time)[0];
            var end_time = line.match(pattern_end_time)[0];
            block.start_time = convertTS2TM(start_time);
            block.end_time = convertTS2TM(end_time);
            block.timestamp = line;
            linecount++;
        }else{
            if(line != ''){
                //console.log('subtitle line:'+ line);
                // console.log('checking last character:' + line.substring(line.length - 1));

                var block = blocks[blockcount];

                if(line.substring(line.length - 1) != '♪' && line.substring(line.length - 1) != ')' && line.substring(line.length - 1) != ']'){
                    sentence += line + ' ';
                    if(linecount == 2){
                        //push line number to subtitle index array
                        console.log('push line number to tmp array, line number=' + block.line_number);
                        sub_index_arr.push(block.line_number);
                    }


                }else{
                    //debug
                    console.log('not english subtitle, line:' + line);
                    block.issubtitle = false;
                    block.sentence = -1;

                }

                if(line.substring(line.length - 1) == '.' || line.substring(line.length - 1) == '?'){
                    //debug
                    //console.log('push a new sentence into queue, s:' + sentence + ' index: ' + sentence_index);
                    console.log('reached end of line, line=' + line);
                    //reached end of a sentence
                    //replace multiple spaces to single space

                    sentence = sentence.replace(/ +/g, ' ');
                    /**
                     * sentence block object
                     * sentence
                     * translation
                     * subtitle index array
                     */

                    var s_block = {};
                    s_block.sentence = sentence;
                    s_block.index = sentence_index;
                    s_block.translation = '';
                    s_block.sub_index_arr = sub_index_arr;
                    sentence_block.push(s_block);
                    sentence_index++;
                    sentence = '';
                    sub_index_arr = [];
                }

                //remove last whitespace
                var c = line.charAt(line.length - 1);
                if(c == ' ')//remove last space
                    line = line.substring(0, line.length - 1);
                c = line.charAt(0);
                if(c== ' ')//remove first space
                    line = line.substring(1, line.length);
                if(linecount == 3)
                    block.subtitle += ' ' + line;
                else
                    block.subtitle = line;

                linecount++;
            }else{
                linecount = 0;
                blockcount++;
            }
        }


    })
    .on('error', function(e) {
        // something went wrong
        console.log(e);
    })
    .on('close', function(e){
        console.log('finished traversing english subtitle, pass block arrays to callback. token=' + token);

        callback(token);
        stateEmitter.emit(1001, token);
        blockcount = 0;
        linecount = 0;
    });


}

exports.generateSubtitle = function(token, targetFile){
    var task = tasks[token];
    var sentence_block = task.sentence_block;
    var blocks = task.blocks;
    console.log('start generating final subtitle file...' + targetFile);
    console.log('traversing subtitle blocks');
    var subtitle_count = 0;
    for(var i=0; i<blocks.length; i++){
        var block = blocks[i];
        if(block.issubtitle){
            console.log('current block is subtitle block');
            console.log('append line number');
            fs.appendFileSync(targetFile, block.line_number + '\n');
            console.log('append timestamp');
            fs.appendFileSync(targetFile, block.timestamp + '\n');

            console.log('block.sentence=' + block.sentence);
            console.log('subtitle_count=' + subtitle_count);

            var s_block = sentence_block[block.sentence];
            if(subtitle_count <= (s_block.sub_index_arr.length - 1)){
                var start = s_block.translation.length/s_block.sub_index_arr.length * subtitle_count;
                var end = s_block.translation.length/s_block.sub_index_arr.length * (subtitle_count + 1);
                var chinese = s_block.translation.substring(start, end);
                console.log('translation length:' + s_block.translation.length);
                console.log('subtitle array length:' + s_block.sub_index_arr.length);
                console.log('start:' + start + ' end:' + end);

                console.log('append chinese:' + chinese);
                fs.appendFileSync(targetFile, chinese + '\n');
                if( subtitle_count == (s_block.sub_index_arr.length - 1) ){
                    console.log('last subtitle block in current sentence appending');
                    subtitle_count = 0;
                }else{
                    subtitle_count++;
                }

            }
            // else if(subtitle_count == (s_block.sub_index_arr.length - 1)){
            //     //last block
            //     console.log('last subtitle block in current sentence appending');
            //     var start = s_block.translation.length/s_block.sub_index_arr.length * subtitle_count;
            //     var chinese = s_block.translation.substring(start, s_block.translation.length - 1) + '\n';
            //     fs.appendFileSync(targetFile, chinese);
            //     subtitle_count = 0;
            // }
            console.log('append english & blank line\n');
            var english = block.subtitle + '\n\n';
            fs.appendFileSync(targetFile, english);


        }else{
            console.log('this block is not subtitle block');
            console.log('append line number');
            fs.appendFileSync(targetFile, block.line_number + '\n');
            console.log('append timestamp');
            fs.appendFileSync(targetFile, block.timestamp + '\n');
            console.log('append data & blank line');
            fs.appendFileSync(targetFile, block.subtitle + '\n\n');

        }
    }

    if(observer != null){
        observer.emit(1004, targetFile);
    }

}

exports.showSubtitleBlock = function(block){
    console.log('line number:' + block.line_number + '| timestamp:' + block.timestamp + '| start_time=' + block.start_time + '| end_time=' + block.end_time + '| subtitle=' + block.subtitle + '| sentence_index=' + block.sentence);
}

exports.showSentenceBlock = function(block){
    console.log('sentence=' + block.sentence + '| sentence index=' + block.index);
    for(var i=0; i<block.sub_index_arr.length; i++){
        console.log('index=' + block.sub_index_arr[i]);
    }
    console.log('\n');

}

exports.registerObserver = function(o){
    observer = o;
    console.log('observer registered');
}

//translate sentence to Chinese
//request google cloud service
function translate(token, s_block){
    translator.translate(s_block.sentence, target_lang)
        .then(function(results){
            var translation = results[0];
            s_block.translation = translation;
            stateEmitter.emit(1002, token);
           // console.log('translation:' + translation);

        });
}

//translate sentence to Chinese
//request remote translate service
// function translate(s_block){
//     //console.log('english:' + s_block.sentence);
//     request.post({
//         headers: {'content-type' : 'application/x-www-form-urlencoded'},
//         url:     'http://35.194.218.130:8080/translate',
//         body:    "content=" + s_block.sentence
//     }, function(error, response, body){
//         if(error){
//             console.log(error);
//         }else{
//           //  console.log(body);
//             s_block.translation = body;
//
//             stateEmitter.emit(1002);
//         }
//
//
//
//     });
// }

//convert formatted timestamp to time value in miliseconds
function convertTS2TM(timestamp){
    var raw = timestamp.split(',');
    var time = raw[0].split(':');
    var hour = parseInt(time[0]);
    var minute = parseInt(time[1]);
    var second = parseInt(time[2]);

    var miliseconds = parseInt(raw[1]);

    var total = miliseconds + second * 1000 + minute * 60000 + hour * 3600000;
    // console.log('total:' + total + ' hour='+ hour + ' minute=' + minute + ' second=' + second + ' miliseconds=' + miliseconds);
    return total;
}

//convert plain time value to formatted timestamp
function convertTM2TS(tm){

    var ms = tm%1000;
    var s = parseInt(tm/1000)%60;
    var m = parseInt(tm/60000);
    var h = parseInt(tm/3600000);
    var ms_str,s_str, m_str, h_str;
    if(ms < 10){
        ms_str = '00' + ms;
    }else if(ms >= 10 && ms < 100 ){
        ms_str = '0' + ms;
    }else{
        ms_str = ms;
    }

    if(s < 10){
        s_str = '0' + s;
    }else{
        s_str = s;
    }

    if(m < 10){
        m_str = '0' + m;
    }else{
        m_str = m;
    }

    if(h < 10){
        h_str = '0' + h;
    }else{
        h_str = h;
    }

    var result = h_str + ':' + m_str + ':' + s_str + ',' + ms_str;
    return result;
}
