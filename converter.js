const fs = require('fs');
const readline = require('linebyline');
const patterns = require('./string_patterns');
const EventEmitter = require('events');
class customEventEmitter extends EventEmitter{};
const stateEmitter = new customEventEmitter();

var files = [];

//for testing purpose
var src_path = 'Y:\\Developer\\tmp\\udacity\\';
var dst_path = 'Y:\\Developer\\tmp\\udacity_output\\';

var index = 0;

stateEmitter.on('process', ()=>{
    index++;
    if(index < files.length){
        let src = src_path + files[index];
        let dst = dst_path + files[index];
        console.log('start converting ' + src);
        convertDoubleToSingle(src, dst);
    }else{
        console.log('subtitles conversion finished.');
    }

});



fs.readdir(src_path, (err, items) => {
    for(let i=0; i<items.length; i++){
        files.push(items[i]);
    }
    let src = src_path + files[0];
    let dst = dst_path + files[0];
    console.log('start converting ' + src);
    convertDoubleToSingle(src, dst);

});

function convertDoubleToSingle(src, dst){
    let file = readline(src);
    let block = '';
    let linecount = 0;
    file.on('line', function(line, lineCount, byteCount){
        if(linecount == 0 && line != ''){
            // console.log('line index:' + line);
            //create new block
            /**
             * block object
             * start_time
             * end_time
             * subtitle
             */
            block = (line + '\n');
            linecount++;
        }else if(linecount == 1){
            // console.log('timestamp:' + line);
            block += (line + '\n');
            linecount++;
        }else if(linecount == 2){
            // console.log('chinese subtitle line:' + line);
            block += (line + '\n');
            linecount++;
        }else if(linecount == 3){
            // console.log('english subtitle line:' + line);
            block += '\n';
            linecount = 0;
            fs.appendFileSync(dst, block);
        }

    })
    .on('close', function(e){
        // console.log('finished traversing chinese subtitle');
        stateEmitter.emit('process');
    });
}




