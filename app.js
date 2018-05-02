const readline = require('linebyline');
const fs = require('fs');
const ytdl = require('youtube-dl');
const ffmpeg = require('ffmpeg');

var timelines_en = [];
var timelines_zh = [];
var videoid_list = [];
var video_index = 0;
//patterns
      //start time
var pattern_start_time = /^[0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]\,[0-9][0-9][0-9]/;
//end time
var pattern_end_time = /[0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]\,[0-9][0-9][0-9]$/;
var pattern_timestamp = /^[0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]\,[0-9][0-9][0-9] --> [0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]\,[0-9][0-9][0-9]/g;
var pattern_num = /\d+/;
var pattern_chinese_symbol = /[，|。|、|？|！|￥|（|）|【|】|？|“|”]/g;



const EventEmitter = require('events');
class customEventEmitter extends EventEmitter{};
const stateEmitter = new customEventEmitter();


stateEmitter.on(999, function(){
	//video list loaded
});

stateEmitter.on(1000, function(language, videoid){
	if(lanugage == 'en'){
		downloadSubtitle(videoid, 'zh-Hans');
	}else if(lanugage == 'zh-Hans'){
		video_index++;
		var videoid = videoid_list[video_index];
		downloadSubtitle(videoid, 'en');
	}
});

stateEmitter.on(1001, function(){
	// traverseArray(blocks_en);
	traversingChinese();
});

stateEmitter.on(1002, function(){
	combineSubtitle3();
	// combineSubtitle2();
	// compare();
	// traverseArray(blocks_en);
	// traverseArray(blocks_zh);
	
	
});

stateEmitter.on(1003, function(){
	generateSubtitle(combined, 'output5.srt');
	// traverseStringArray(combined);
	// traverseStringArray(merge_index);
});



function downloadSubtitle(videoid, language){//en: english   zh-Hans: simplified chinese
	var youtubedl = require('youtube-dl');

 	var url = 'https://www.youtube.com/watch?v=' + videoid;
	var options = {
	  // Write automatic subtitle file (youtube only)
	  auto: false,
	  // Downloads all the available subtitles.
	  all: false,
	  // Languages of subtitles to download, separated by commas.
	  lang: language,
	  // The directory to save the downloaded files in.
	  cwd: __dirname + '/subtitles/' + videoid + '.vtt',
	};
	youtubedl.getSubs(url, options, function(err, files) {
	  if (err) throw err;
	 	stateEmitter.emit(1000, language, videoid);
	  console.log('subtitle files downloaded:', files);
	});
}

function convertVTTToSrt(){
	var process = ffmpeg('en.vtt');
	process.then(function(sub){
		console.log('converted subtitle file');
		sub.save('gen.srt');
	});
}

var linecount = 0;
var blockcount = 0;
var blocks_en = [];
var blocks_zh = [];
var combined = [];
var merge_index = [];
function traversingEnglish(){
	console.log('traversing english subtitle...');
	var rl_en = readline('./en.srt');
	rl_en.on('line', function(line, lineCount, byteCount) {
		if(linecount == 0){
			// console.log('line index:' + line);
			//create new block
			/**
			 * block object
			 * timestamp
			 * start_time
			 * end_time
			 * subtitle
			 */
			var block = [];
			block.subtitle = '';
			blocks_en.push(block);
			linecount++;
		}else if(linecount == 1){
			// console.log('timestamp:' + line);
			var block = blocks_en[blockcount];
			var start_time = line.match(pattern_start_time)[0];
			var end_time = line.match(pattern_end_time)[0];
			block.start_time = convertTS2TM(start_time);
			block.end_time = convertTS2TM(end_time);
			block.timestamp = line;
			linecount++;
		}else{
			if(line != ''){
				// console.log('subtitle line:'+ line);
				var block = blocks_en[blockcount];
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
				// console.log('block subtitle:' + block.subtitle);
			}else{
				// console.log('new line');
				linecount = 0;
				blockcount++;
			}
		}
		
		
		
	// // do something with the line of text
	// var str = line.match(pattern_timestamp);
	// 	// console.log(str);
	// 	if(str != null){
	// 		// console.log('timeline:' + str[0]);
	// 		timelines_en.push(str[0]);
	// 	}

	})
	.on('error', function(e) {
	// something went wrong
		console.log(e);
	})
	.on('close', function(e){
		console.log('finished traversing english subtitle');
		stateEmitter.emit(1001);
		blockcount = 0;
		linecount = 0;
	});	
}



function traversingChinese(){
	var rl_zh = readline('./zh.srt');
	console.log('traversing chinese subtitle...');
	rl_zh.on('line', function(line, lineCount, byteCount){
		if(linecount == 0){
			// console.log('line index:' + line);
			//create new block
			/**
			 * block object
			 * start_time
			 * end_time
			 * subtitle
			 */
			var block = [];
			block.subtitle = '';
			blocks_zh.push(block);
			linecount++;
		}else if(linecount == 1){
			// console.log('timestamp:' + line);
			var block = blocks_zh[blockcount];
			var start_time = line.match(pattern_start_time)[0];
			var end_time = line.match(pattern_end_time)[0];
			block.start_time = convertTS2TM(start_time);
			block.end_time = convertTS2TM(end_time);
			block.timestamp = line;
			
			linecount++;
		}else{
			if(line != ''){
				console.log('subtitle line:'+ line);
				line = line.replace(pattern_chinese_symbol, '  ');
				console.log('removed punctuation:' + line);
				var block = blocks_zh[blockcount];
				if(linecount == 3)
					block.subtitle += line;
				else					
					block.subtitle = line;
				// console.log('block subtitle:' + block.subtitle);
				linecount++;
			}else{
				// console.log('new line');
				linecount = 0;
				blockcount++;
			}
		}
		// var str = line.match(pattern_timestamp);
		// console.log(str);
		// if(str != null){
		// 	console.log('timeline:' + str[0]);
		// 	timelines_zh.push(str[0]);
		// }
	})
	.on('close', function(e){
		console.log('finished traversing chinese subtitle');
		stateEmitter.emit(1002);
	});
}

function compare(){
	console.log('count of blocks in english subtitle:' + timelines_en.length);
	console.log('count of blocks in chinese subtitle:' + timelines_zh.length);
	console.log('comparing english and chinese subtitles');
	var lines = timelines_en.length <= timelines_zh.length? timelines_en.length : timelines_zh.length;
	var j = 0;
	for(var i = 0; i < lines; i++){
		console.log('index:' + i);
		console.log('english: '+ timelines_en[i] + '  chinese: ' + timelines_zh[i]);
		// if(timelines_en[i] == timelines_zh[j]){
		// 	j++;
		// 	console.log('same timeline!');
		// }
	}
	console.log('compare completed');
}

function traverseArray(arr){
	for(var i=0; i<arr.length; i++){
		var block = arr[i];
		console.log('block[' + i + ']:timestamp=' + block.timestamp +' start_time=' + block.start_time + ' end_time=' + block.end_time + ' subtitle=' + block.subtitle);
	}

}

function traverseStringArray(arr){
	for(var i=0; i<arr.length; i++){
		var str = arr[i];
		console.log('item[' + i + ']=' + str);
	}
}

var output_file = 'output.srt';
//take english timestamp as reference
function combineSubtitle(){
	var j = 0;
		for(var i=0; i<blocks_en.length; i++){
			var block_en = blocks_en[i];
			console.log('block_en:' + block_en.subtitle);
			var outputData = i + '\n'
							+ block_en.timestamp + '\n';
							// + block_zh.subtitle + '\n';
		
			var loop = false;
			var loopCount = 0;
			if(j < blocks_zh.length){
				loop = true;
			}
			while(loop){
				if(j >= blocks_zh.length){
					console.log('j >= blocks_zh.length');
					break;
				}
				var block_zh = blocks_zh[j + loopCount];
				console.log('chinese time:' + block_zh.timestamp);
				console.log('english time:' + block_en.timestamp);
				// console.log('block_zh:' + block_zh.timestamp);
				//find chinese subtitle of the same start time as english subtitle
				if(block_zh.start_time > block_en.end_time){
					console.log('not overlapped');
					loop = false;
				}else if(block_zh.end_time < block_en.start_time){
					console.log('not overlapped, j++');

					j++;
				}else{
					console.log('overlapped');
					outputData += (block_zh.subtitle + '\n');
					loop = false;
				}
			
				
			}//loop of blocks_zh
			//append english subtitle						
			outputData += (block_en.subtitle + '\n\n');//append a newline after each block
			console.log('outputData:\n' + outputData);
			console.log('i='+ i + ' j=' + j);
			//write subtitle block to target file
			fs.appendFileSync(output_file, outputData);
		}//loop of blocks_en
}
//take chinese timestamp as reference
function combineSubtitle2(){
	var j = 0;
	for(var i=0; i<blocks_zh.length; i++){
		var block_zh = blocks_zh[i];
		// showBlock(block_zh);
		console.log('index:' + (i+1));
		var outputData = (i+1) + '\n'
						+ block_zh.timestamp + '\n'
						+ block_zh.subtitle + '\n';

		
		
		var loop = true;
		var loopCount = 0;
		while(loop){
			var block_en = blocks_en[j];
			// showBlock(block_en);
			//find english subtitle of the same start time as chinese subtitle
			if(block_en.start_time >= block_zh.start_time && block_en.start_time < block_zh.end_time){
				if(loopCount == 0){
					//first english block
					outputData += block_en.subtitle;
				}else{
					console.log('multilines, merge! loopCount=' + loopCount);
					console.log('english start_time:' + block_en.start_time + ' converted timestamp:' + convertTM2TS(block_en.start_time));					
					outputData += ' ' + block_en.subtitle;
					
				}
				j++;
				//find english subtitle of the same end time as chinese subtitle
				if(block_en.end_time >= block_zh.end_time){
					// console.log('block_en.end_time >= block_zh.end_time)');
					loop = false;					
				}
			}else if(block_en.end_time < block_zh.start_time){
				// console.log('block_en.start_time < block_zh.start_time');
				j++;				
			}else if(block_en.start_time > block_zh.end_time){
				loop = false;
			}else{
				console.log('unknown state');
			}			
			loopCount++;
		}
		outputData += '\n\n';//append a newline after each block
		// console.log('outputData:\n' + outputData);
		combined.push(outputData);
		// console.log('i='+ i + ' j=' + j);
		//write subtitle block to target file
		// fs.appendFileSync(output_file, outputData);
	}//loop of blocks_zh

	console.log('finished combination');
	stateEmitter.emit(1003);
}

//take chinese timestamp as reference and save combined data as output objects
/**
 * object output
 * index
 * start time
 * middle time array
 * end time
 * merged
 * chinese subtitle
 * english subtitle array
 */

function combineSubtitle3(){
	var j = 0;
	
	for(var i=0; i<blocks_zh.length; i++){
		var block_zh = blocks_zh[i];
		
		var outputData = [];
		outputData.index = i + 1;
		outputData.start_time = block_zh.start_time;
		outputData.end_time = block_zh.end_time;
		outputData.middle_time = [];
		outputData.subtitle_zh = block_zh.subtitle; 
		outputData.subtitle_en = [];
		outputData.merged = false;
		
		var loop = true;
		var loopCount = 0;
		while(loop){
			var block_en = blocks_en[j];
			// showBlock(block_en);
			//find english subtitle of the same start time as chinese subtitle
			if(block_en.start_time >= block_zh.start_time && block_en.start_time < block_zh.end_time){
				if(loopCount == 0){
					outputData.subtitle_en.push(block_en.subtitle);
					// console.log('chinese:' + block_zh.timestamp + ' english:' + block_en.timestamp);
				}else{
					// console.log('index:' + outputData.index );
					// console.log('multilines, merge! loopCount:' + loopCount);
					// console.log('chinese:' + block_zh.timestamp + ' english:' + block_en.timestamp);
					// console.log('chinese:' + block_zh.subtitle + ' start_time' + block_zh.start_time + ' end_time:' + block_zh.end_time);
					// console.log('english endtime:' + block_en.end_time);									
					outputData.merged = true;				
					outputData.subtitle_en.push(block_en.subtitle);										
					outputData.middle_time.push(block_en.start_time);

				}
				j++;
				//find english subtitle of the same end time as chinese subtitle
				if(block_en.end_time >= block_zh.end_time){
					// console.log('block_en.end_time >= block_zh.end_time)');
					loop = false;					
				}
			}else if(block_en.end_time < block_zh.start_time){
				// console.log('block_en.start_time < block_zh.start_time');
				j++;
				continue;				
			}else if(block_en.start_time > block_zh.end_time){
				loop = false;
			}else{
				console.log('unknown state');
			}			
			loopCount++;
		}
		combined.push(outputData);

	}//loop of blocks_zh

	console.log('finished combination');
	stateEmitter.emit(1003);
}

function generateSubtitle(combined, filename){
	var index = 0;
	for(var i=0; i<combined.length; i++){
		var output = combined[i];
		var str = '';
		if(output.merged){
			for(var j=0; j<output.subtitle_en.length; j++){
				var start_time_str, end_time_str;

				if(j==0){
					start_time_str = convertTM2TS(output.start_time + 10);
					end_time_str = convertTM2TS(output.middle_time[j] - 10);
										
				}else if(j == (output.subtitle_en.length - 1)){
					start_time_str = convertTM2TS(output.middle_time[j - 1] + 10);
					end_time_str = convertTM2TS(output.end_time - 10);
				}else {
					start_time_str = convertTM2TS(output.middle_time[j - 1] + 10);
					end_time_str = convertTM2TS(output.middle_time[j] - 10);
				}
				str = str
					  + (index + 1) + '\n'
				      + start_time_str + ' --> ' +  end_time_str + '\n'
				      + output.subtitle_zh + '\n'
				      + output.subtitle_en[j] + '\n\n';				
				index++;
				
			}			
			// console.log('merged line:\n' + str);
			fs.appendFileSync(filename, str);
		}else{
			var start_time_str, end_time_str;
			start_time_str = convertTM2TS(output.start_time + 10);
			end_time_str = convertTM2TS(output.end_time - 10);
			str = str 
				+ (index + 1) + '\n'
				+ start_time_str + ' --> ' +  end_time_str + '\n'
				+ output.subtitle_zh + '\n'
				+ output.subtitle_en[0] + '\n\n';	
			index++;
			fs.appendFileSync(filename, str);
			
			// console.log('unmerged line:\n' + str);
		}
	}
}

function showBlock(block){
	console.log('timestamp:' + block.timestamp + ' start_time=' + block.start_time + ' end_time=' + block.end_time + ' subtitle=' + block.subtitle);
}

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

function getWordCount(str){
	return str.split(' ').length;
}


//start processing
console.log('\n\n\n\n\n**********************************************************************\n');
console.log('**********************************-------processing------****************************');
console.log('\n\n\n\n');
// traversingEnglish();
convertVTTToSrt();

