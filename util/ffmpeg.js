const child_process = require('child_process');
const spawn = require('await-spawn')

const config = require("../nuxt.config.js");

const JSONStream = require('JSONStream');
const fs = require('fs');

const ffmpegJobQueue = {};

exports.ffmpegJobQueue = ffmpegJobQueue;

exports.startHLSstream = async function startHLSstream(itemId, mediaLocation) {
    if (ffmpegJobQueue[itemId] == undefined) {
        ffmpegJobQueue[itemId] = {};
    }
    let playlist = "";
    let workDir = `${config.default.publicRuntimeConfig.HLS_SERVE_DIR}${itemId}/`;
    if (ffmpegJobQueue[itemId]['ffmpeg'] == undefined) {
        ffmpegJobQueue[itemId]['ffmpeg'] = {};
        console.log(`Starting ${itemId} transcode job`);
        const mediaInfo = await ffprobeMediaInfo(mediaLocation);
        // console.log(mediaInfo);

        try {
            await fs.promises.mkdir(workDir);
        } catch (error) {
            if (error.code === 'EEXIST') {
                console.log(`'${itemId}' workdir already exists at: ${workDir}, removing all .ts and .m3u8 within...`)
                fs.readdirSync(workDir)
                    .filter(f => (f.endsWith('.ts') || f.endsWith('.m3u8') || f == 'ffmpeg_finished'))
                    .map(f => fs.unlinkSync(workDir + f))
            } else {
                console.log(error);
            }
        }
        // workDir is where all HLS stuff is stored
        // build playlist and res file
        // TODO investigate a 'streamed' HLS which adds to the .m3u8 as new streams are built
        // would mean I don't have to make sure segments exist when a client retrieves them
        // as long as video.js knows to keep redownloading the m3u8 based on it's stream header
        // also means I can copy a video stream instead of reencoding it for new keyframes
        playlist = await createHLSPlayList(workDir, 'playlist', itemId, mediaInfo);
        ffmpegJobQueue[itemId]['playlist'] = playlist;

        ffmpegJobQueue[itemId]['ffmpeg'] = startffmpegHLSTranscode(transcodeStringBuilder(mediaInfo, mediaLocation, false, workDir), workDir, itemId);
    } else {
        while (ffmpegJobQueue[itemId]['playlist'] == undefined) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        playlist = ffmpegJobQueue[itemId]['playlist'];
        // if (ffmpegJobQueue[itemId]['playlist']) {
        //     playlist = ffmpegJobQueue[itemId]['playlist'];
        // } else {
        //     // have to add a wait here until file exists
        //     // TODO ugly
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        //     playlist = await fs.promises.readFile(`${workDir}playlist.m3u8`);
        // }
    }
    return playlist;
}

// TODO sanitise itemId string
function cleanUpffmpegDir(itemId) {
    let workDir = `${config.default.publicRuntimeConfig.HLS_SERVE_DIR}${itemId}/`;
    console.log(`Deleting ${workDir}...`)
    fs.rmSync(workDir, { recursive: true, force: true });
}

exports.cleanUpffmpegDir = cleanUpffmpegDir;

function transcodeStringBuilder(mediaInfo, mediaLocation, seekTime, workDir) {
    // TODO this does not handle 23.976 fps nicely when it comes to keyframes every x
    const duration = mediaInfo.format.duration;
    let fps = mediaInfo.streams[0].avg_frame_rate;
    if (fps.includes('/')) {
        let [numerator, denominator] = fps.split('/');
        fps = Math.round(numerator / denominator)
    }
    let keyFrameIntervals = fps * config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE;
    let segmentsCount = parseInt(duration / config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE) + 1;


    const ffmpegArgs = [
        // mediaInfo.seekTime ? `-ss ${mediaInfo.seekTime} ` : "",
        // seekTime ? `-ss ${seekTime} ` : "",
        `-ss ${seekTime || "00:00:00"} `,
        `-i ${mediaLocation} `,
        // `-filter_complex "[0:v]split=1[v1]; [v1]copy[v1out]" `,
        //video
        // `-map [v1out] -c:v:0 libx264 -x264-params "nal-hrd=cbr:force-cfr=1" -b:v:0 5M -maxrate:v:0 5M -minrate:v:0 5M -bufsize:v:0 10M -preset fast -g ${keyFrameIntervals} -sc_threshold 0 -keyint_min ${keyFrameIntervals} `,
        mediaInfo.format.bit_rate <= 6144000 && mediaInfo.streams[0].codec_name == 'h264'/*(6000 kbs) */ ?
        // TODO will need to use copy but have to handle keyframes
        //  `-c:v copy` :
        `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 ` :
        `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 `,
        // if h264 codec and under max bitrate (6000 for now)
        // `-c:v copy`,

        // audio
        // TODO: assumes stream 1 is main audio track
        mediaInfo.streams[1].channels == 2 && mediaInfo.streams[1].codec_name == 'aac' ?
        `-c:a copy ` :
        mediaInfo.streams[1].channels == 2 ?
        `-c:a aac -b:a 192k ` :
        // below is downmix with volume boost: https://superuser.com/a/1410620
        `-c:a aac -b:a 192k -vol 425 -af "pan=stereo|FL=0.5*FC+0.707*FL+0.707*BL+0.5*LFE|FR=0.5*FC+0.707*FR+0.707*BR+0.5*LFE" `,

        //segmenting
        // `-f hls -hls_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} -hls_playlist_type vod -hls_flags independent_segments -hls_segment_type mpegts -hls_segment_filename ${workDir}%0${segmentsCount.toString().length}d.ts `,
        // `-var_stream_map "v:0,a:0" ignore.m3u8 `, // TODO ignore.m3u8 should be in config (it is important because it is watched to discover that ffmpeg)
        // `-f ssegment -segment_list_flags +live -segment_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} -segment_start_number ${seekTime ? ('4')/* calculate seek segment here */ : '0'} ${workDir}%0${segmentsCount.toString().length}d.ts`,
        `-f ssegment -segment_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} -segment_start_number ${seekTime ? ('4')/* calculate seek segment here */ : '0'} ${workDir}%0${segmentsCount.toString().length}d.ts `,
        // mediaInfo.streams[0].width > 1921 ? `-vf scale=1920:-1 ` : "",
        // `-maxrate 6000 `
    ]
    let ffmpegString = "ffmpeg ";
    for (const arg of ffmpegArgs) {
        ffmpegString += arg;
    }
    /*
        "-ss", time,
        "-i", input,
        "-f", t.Config.Video.Format,
        "-c:v", t.Config.Video.CompressionAlgo,
        "-c:a", t.Config.Audio.CompressionAlgo,
        "-maxrate", maxBitrate,
        "-vf", fmt.Sprintf("scale=%s", resolution),
        "-threads", "0",
        "-preset", "veryfast",
        "-tune", "zerolatency",
        "-map", fmt.Sprintf("0:v:%v", videoStream),
        "-map", fmt.Sprintf("0:a:%v", audioStream),
        "-movflags", "frag_keyframe+empty_moov", // This was to allow mp4 encoding.. not sure what it implies
        TODO boost audio gain and downmux to stereo
    */
    return ffmpegString;
}

async function ffprobeMediaInfo(video_input) {
    try {
        const bl = await spawn(`ffprobe`,[`-v`,`quiet`,`-print_format`,`json`, `-show_format`, `-show_streams`, video_input]);
        return JSON.parse(bl.toString());
    } catch (e) {
        // TODO this throws invis errors
        console.log(e.stderr.toString())
    }
}

async function createHLSPlayList(destination, playlist_filename, itemId, mediaInfo) {
    const duration = mediaInfo.format.duration;
    let playlistM3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=${mediaInfo.streams[0].width}x${mediaInfo.streams[0].height}
${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${itemId}/stream0.m3u8`
//${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${itemId}/${mediaInfo.streams[0].height}p.m3u8`

    let segmentM3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE}
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD`;
    let segmentsCount = parseInt(duration / config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE) + 1;
    for (let i = 0; i < segmentsCount; i++) {
        // add each segment to segments .m3u8
        segmentM3U8 += `
#EXTINF:${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE}.000000,
${i.toString().padStart(segmentsCount.toString().length, '0')}.ts`;
    }
    segmentM3U8 += `
#EXT-X-ENDLIST`;

    await Promise.all([
        fs.promises.writeFile(`${destination}/${playlist_filename}.m3u8`, playlistM3U8),
        fs.promises.writeFile(`${destination}/stream0.m3u8`, segmentM3U8)]);
        // fs.promises.writeFile(`${destination}/${mediaInfo.streams[0].height}p.m3u8`, segmentM3U8)]);

    return playlistM3U8;
}

function startffmpegHLSTranscode(ffmpegcommand, destination, itemId) {
    // TODO: can send abortsignal
    // const ac = new AbortController();
    // const { signal } = ac;
    // setTimeout(() => ac.abort(), 30000);
    return child_process.exec(ffmpegcommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        delete ffmpegJobQueue[itemId];
        child_process.exec(`touch ${destination}/ffmpeg_finished`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
        });
    });
}