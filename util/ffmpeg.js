const child_process = require('child_process');
const spawn = require('await-spawn')

const config = require("../nuxt.config.js");

// const { jellyfinGetSubtitles } = require('../api/routes/jellyfin');
import { validate as uuidValidate } from 'uuid';

const fs = require('fs');

const ffmpegJobQueue = {};

// https://superuser.com/a/1255877 these constants / time difference between video generated and what I'm seeing is due to audio sample rate in the hls segment

exports.ffmpegJobQueue = ffmpegJobQueue;

exports.startHLSstream = async function startHLSstream(roomUUID, itemId, mediaLocation, subtitleInfo) {
    if (ffmpegJobQueue[roomUUID] == undefined) {
        ffmpegJobQueue[roomUUID] = {};
    }
    let playlist = "";
    const workDir = `${config.default.publicRuntimeConfig.HLS_SERVE_DIR}${roomUUID}/`;
    if (ffmpegJobQueue[roomUUID]['ffmpeg'] === undefined && ffmpegJobQueue[roomUUID]['itemId'] !== itemId) {
        // ffmpegJobQueue[roomUUID]['ffmpeg'] = {};
        ffmpegJobQueue[roomUUID]['itemId'] = itemId;
        console.log(`Starting ${roomUUID} transcode job`);
        const mediaInfo = await ffprobeMediaInfo(mediaLocation);
        // rarely, video isn't in position 0 of stream array
        if (mediaInfo.streams[0].codec_type !== 'video') {
            let temp = mediaInfo.streams[0];
            mediaInfo.streams[0] = mediaInfo.streams[1];
            mediaInfo.streams[1] = temp;
        }

        try {
            await fs.promises.mkdir(workDir);
        } catch (error) {
            if (error.code === 'EEXIST') {
                console.log(`'${roomUUID}' workdir already exists at: ${workDir}, removing all .ts and .m3u8 within...`)
                await Promise.all(
                    (await fs.promises.readdir(workDir))
                    .filter(f => (f.endsWith('.ts') || f.endsWith('.m3u8') || f.endsWith('.vtt') || f == 'ffmpeg_finished'))
                    .map(f => fs.promises.unlink(workDir + f).catch(() => null))
                );
                // console.log(`Deleted contents of dir, now contains: ${await fs.promises.readdir(workDir)}`)
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

        ffmpegJobQueue[roomUUID]['ffmpeg'] = startffmpegHLSTranscode(transcodeStringBuilder(mediaInfo, mediaLocation, false, workDir, roomUUID), workDir, roomUUID);
        console.log(`Started ${roomUUID} transcode job`);

        playlist = await createHLSPlayList(workDir, 'playlist', roomUUID, mediaInfo, subtitleInfo);
        ffmpegJobQueue[roomUUID]['playlist'] = playlist;
    } else {
        while (ffmpegJobQueue[roomUUID]['playlist'] === undefined) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        playlist = ffmpegJobQueue[roomUUID]['playlist'];
        // playlist = await recurseGetPlaylist(workDir, 'playlist');
    }
    return playlist;
}

exports.startYTDLPHLSstream = async function startYTDLPHLSstream(roomUUID, itemId, mediaLocation, subtitleInfo) {
    console.log({roomUUID, itemId, mediaLocation, subtitleInfo});
    if (ffmpegJobQueue[roomUUID] == undefined) {
        ffmpegJobQueue[roomUUID] = {};
    }
    let playlist = "";
    const workDir = `${config.default.publicRuntimeConfig.HLS_SERVE_DIR}${roomUUID}/`;
    if (ffmpegJobQueue[roomUUID]['ffmpeg'] === undefined && ffmpegJobQueue[roomUUID]['itemId'] !== itemId) {
        // ffmpegJobQueue[roomUUID]['ffmpeg'] = {};
        ffmpegJobQueue[roomUUID]['itemId'] = itemId;
        console.log(`Starting ${roomUUID} transcode job`);

        ffmpegJobQueue[roomUUID]['mediaInfo'] = await ytdlpMediaInfo(mediaLocation);
        const mediaInfo = ytdlpMediaInfoToFfprobe(ffmpegJobQueue[roomUUID]['mediaInfo']);
        // catch m3u8 of remote media here and return it instead of doing our own transcode
        if (mediaInfo.m3u8 !== undefined) {
            let url = mediaInfo.m3u8
            ffmpegJobQueue[roomUUID]['remoteM3u8'] = url;
            return { url };
        }

        try {
            await fs.promises.mkdir(workDir);
        } catch (error) {
            if (error.code === 'EEXIST') {
                console.log(`'${roomUUID}' workdir already exists at: ${workDir}, removing all .ts and .m3u8 within...`)
                (await fs.promises.readdir(workDir))
                    .filter(f => (f.endsWith('.ts') || f.endsWith('.m3u8') || f.endsWith('.vtt') || f == 'ffmpeg_finished'))
                    .map(async (f) => await fs.promises.unlink(workDir + f))
            } else {
                console.log(error);
            }
        }
        const ffmpegCommand = `yt-dlp -f b ${mediaLocation} -o - | ` + transcodeStringBuilder(mediaInfo, 'pipe:', false, workDir, roomUUID)
        ffmpegJobQueue[roomUUID]['ffmpeg'] = startffmpegHLSTranscode(ffmpegCommand, workDir, roomUUID);
        console.log(`Started ${roomUUID} transcode job`);

        playlist = await createHLSPlayList(workDir, 'playlist', roomUUID, mediaInfo, subtitleInfo);
        ffmpegJobQueue[roomUUID]['playlist'] = playlist;
    } else {
        while (ffmpegJobQueue[roomUUID]['playlist'] === undefined && ffmpegJobQueue[roomUUID]['remoteM3u8'] === undefined) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (ffmpegJobQueue[roomUUID]['playlist'] !== undefined) {
            playlist = ffmpegJobQueue[roomUUID]['playlist'];
        } else if (ffmpegJobQueue[roomUUID]['remoteM3u8'] !== undefined) {
            // remote m3u8 instead of doing our own transcode
            return { 'url':  ffmpegJobQueue[roomUUID]['remoteM3u8']};
        }
        // playlist = await recurseGetPlaylist(workDir, 'playlist');
    }
    return { playlist };
}

async function recurseGetPlaylist(workDir, playlist_filename) {
    try {
        return await fs.promises.readFile(`${workDir}${playlist_filename}.m3u8`);
    } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return await recurseGetPlaylist(workDir, playlist_filename);
    }  
}

async function recurseGetPlaylistSegmentDurations(workDir, playlist_filename) {
    try {
        const playlist = (await fs.promises.readFile(`${workDir}${playlist_filename}.m3u8`)).toString();
        if (playlist.split("#EXTINF:").length < 2) {
            console.log("waiting for more segments");
            throw("waiting for more segments");
        }
        return playlist;
    } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return await recurseGetPlaylistSegmentDurations(workDir, playlist_filename);
    }  
}

// TODO sanitise roomUUID string
exports.cleanUpffmpegDir = async function cleanUpffmpegDir(roomUUID) {
    if (!uuidValidate(roomUUID)) {
        throw new Error('Invalid room UUID');
    }
    let workDir = `${config.default.publicRuntimeConfig.HLS_SERVE_DIR}${roomUUID}/`;
    console.log(`Deleting ${workDir}...`)
    // fs.rmSync(workDir, { recursive: true, force: true });
    await fs.promises.rm(workDir, { recursive: true, force: true });
}

function transcodeStringBuilder(mediaInfo, mediaLocation, seekTime, workDir, roomUUID) {
    // console.log('transcodeStringBuilder');
    const { fps, framesPerSegment, segmentsCount, segmentsLength, videoDuration } = getMediaSegmentsCountLengthAndFps(mediaInfo);
    // console.log('transcodeStringBuilder', fps, framesPerSegment, segmentsCount, segmentsLength, videoDuration);

    // const ffmpegArgs = [
    //     // mediaInfo.seekTime ? `-ss ${mediaInfo.seekTime} ` : "",
    //     // seekTime ? `-ss ${seekTime} ` : "",
    //     `-ss ${seekTime || "00:00:00"} `,
    //     `-i ${mediaLocation} `,
    //     // `-filter_complex "[0:v]split=1[v1]; [v1]copy[v1out]" `,
    //     //video
    //     // `-map [v1out] -c:v:0 libx264 -x264-params "nal-hrd=cbr:force-cfr=1" -b:v:0 5M -maxrate:v:0 5M -minrate:v:0 5M -bufsize:v:0 10M -preset fast -g ${keyFrameIntervals} -sc_threshold 0 -keyint_min ${keyFrameIntervals} `,
    //     mediaInfo.format.bit_rate <= 6144000 && mediaInfo.streams[0].codec_name == 'h264'/*(6000 kbs) */ ?
    //     // TODO will need to use copy but have to handle keyframes
    //     //  `-c:v copy` :
    //     `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 ` :
    //     `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 `,
    //     // if h264 codec and under max bitrate (6000 for now)
    //     // `-c:v copy`,

    //     // audio
    //     // TODO: assumes stream 1 is main audio track
    //     mediaInfo.streams[1].channels == 2 && mediaInfo.streams[1].codec_name == 'aac' ?
    //     `-c:a copy ` :
    //     mediaInfo.streams[1].channels == 2 ?
    //     `-c:a aac -b:a 192k ` :
    //     // below is downmix with volume boost: https://superuser.com/a/1410620
    //     `-c:a aac -b:a 192k -vol 425 -af "pan=stereo|FL=0.5*FC+0.707*FL+0.707*BL+0.5*LFE|FR=0.5*FC+0.707*FR+0.707*BR+0.5*LFE" `,

    //     //segmenting
    //     // `-f hls -hls_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} -hls_playlist_type vod -hls_flags independent_segments -hls_segment_type mpegts -hls_segment_filename ${workDir}%0${segmentsCount.toString().length}d.ts `,
    //     // `-var_stream_map "v:0,a:0" ignore.m3u8 `, // TODO ignore.m3u8 should be in config (it is important because it is watched to discover that ffmpeg)
    //     // `-f ssegment -segment_list_flags +live -segment_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} -segment_start_number ${seekTime ? ('4')/* calculate seek segment here */ : '0'} ${workDir}%0${segmentsCount.toString().length}d.ts`,
    //     `-f ssegment -segment_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} -segment_start_number ${seekTime ? ('4')/* calculate seek segment here */ : '0'} ${workDir}%0${segmentsCount.toString().length}d.ts `,
    //     // mediaInfo.streams[0].width > 1921 ? `-vf scale=1920:-1 ` : "",
    //     // `-maxrate 6000 `
    // ]
    // const ffmpegArgs = [
    //     `-i ${mediaLocation} `,

    //     //video
    //     mediaInfo.format.bit_rate <= 6144000 && mediaInfo.streams[0].codec_name == 'h264'/*(6000 kbs) */ ?
    //     // `-c:v copy` :
    //     `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 ` :
    //     `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 `,

    //     // audio
    //     // TODO: assumes stream 1 is main audio track
    //     mediaInfo.streams[1].channels == 2 && mediaInfo.streams[1].codec_name == 'aac' ?
    //     `-c:a copy ` :
    //     mediaInfo.streams[1].channels == 2 ?
    //     `-c:a aac -b:a 192k ` :
    //     // below is downmix with volume boost: https://superuser.com/a/1410620
    //     `-c:a aac -b:a 192k -vol 425 -af "pan=stereo|FL=0.5*FC+0.707*FL+0.707*BL+0.5*LFE|FR=0.5*FC+0.707*FR+0.707*BR+0.5*LFE" `,

    //     // hls
    //     `-hls_time 10 `,
    //     `-hls_list_size 0 `,
    //     `-hls_allow_cache 1 `,
    //     `-hls_base_url ${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${roomUUID}/ `,
    //     `-hls_segment_filename '${workDir}%03d.ts' `,

    //     // `-hls_flags append_list `

    //     `-hls_playlist_type event `,
    //     // `-hls_playlist_type vod `,

    //     `-flags +cgop `,
    //     `-g 30 `,

    //     `${workDir}${playlist_filename}.m3u8`,
    // ]


    // const ffmpegArgs = [
    //     `-i ${mediaLocation} `,

    //     //video
    //     mediaInfo.format.bit_rate <= 6144000 && mediaInfo.streams[0].codec_name == 'h264'/*(6000 kbs) */ ?
    //     // `-c:v copy` :
    //     `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 -sc_threshold 0 -g ${keyFrameIntervals} ` :
    //     `-c:v libx264 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 -sc_threshold 0 -g ${keyFrameIntervals} `,

    //     // audio
    //     // TODO: assumes stream 1 is main audio track
    //     mediaInfo.streams[1].channels == 2 && mediaInfo.streams[1].codec_name == 'aac' ?
    //     `-c:a copy ` :
    //     mediaInfo.streams[1].channels == 2 ?
    //     `-c:a aac -b:a 192k ` :
    //     // below is downmix with volume boost: https://superuser.com/a/1410620
    //     `-c:a aac -b:a 192k -vol 425 -af "pan=stereo|FL=0.5*FC+0.707*FL+0.707*BL+0.5*LFE|FR=0.5*FC+0.707*FR+0.707*BR+0.5*LFE" `,

    //     // hls
    //     `-hls_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} `,
    //     `-hls_list_size 0 `,
    //     `-hls_allow_cache 1 `,
    //     `-hls_base_url ${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${roomUUID}/ `,
    //     `-hls_segment_filename '${workDir}%0${(segmentsCount + 1).toString().length}d.ts' `,
    //     // `-hls_playlist_type event `,
    //     // `-hls_playlist_type vod `,

    //     `${workDir}ignore.m3u8`,
    // ]




    // fps, framesPerSegment, segmentsCount, segmentsLength
    // https://videoblerg.wordpress.com/2017/11/10/ffmpeg-and-how-to-use-it-wrong/
    // https://superuser.com/questions/908280/what-is-the-correct-way-to-fix-keyframes-in-ffmpeg-for-dash
    // There should be nothing wrong with letting libx264 detect scenecuts and it adding an extra keyframe in the middle of the segment, but then
    // this delays our "keyframe every 240 frames", which makes our segments variable length
    // what i really needed is an option force a keyframe every 240th frame of video, regardless if there are other ones
    const ffmpegArgs = [
        `-hide_banner -loglevel warning -nostats `, // quieten the ffmpeg stdout to avoid overflowing the maxbuffer and having node kill the process
        `-i ${mediaLocation} `,

        //video
        mediaInfo.format.bit_rate <= 6144000 && mediaInfo.streams[0].codec_name == 'h264'/*(6000 kbs) */ ?
        // `-c:v copy` :
        `-c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.2 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 -r ${fps} -g ${framesPerSegment} -force_key_frames "expr:gte(t,n_forced*${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE})" -vf scale=iw:-2 ` :
        // `-c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.2 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 -r ${fps} -g ${framesPerSegment} -sc_threshold 0 -vf scale=iw:-2 ` :
        `-c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.2 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 -r ${fps} -g ${framesPerSegment} -force_key_frames "expr:gte(t,n_forced*${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE})" -vf scale=iw:-2 `,
        // `-c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.2 -preset ${config.default.publicRuntimeConfig.FFMPEG_PRESET_SPEED} -crf 23 -r ${fps} -g ${framesPerSegment} -sc_threshold 0 -vf scale=iw:-2 `,
        // audio
        // TODO: assumes stream 1 is main audio track
        mediaInfo.streams[1].channels == 2 && mediaInfo.streams[1].codec_name == 'aac' ?
        `-c:a copy ` :
        mediaInfo.streams[1].channels == 2 ?
        `-c:a aac -b:a 192k ` :
        // below is downmix with volume boost: https://superuser.com/a/1410620
        `-c:a aac -b:a 192k -vol 425 -af "pan=stereo|FL=0.5*FC+0.707*FL+0.707*BL+0.5*LFE|FR=0.5*FC+0.707*FR+0.707*BR+0.5*LFE" `,

        // ts / advanced options
        `-copyts `, // Do not process input timestamps, but keep their values without trying to sanitize them. In particular, do not remove the initial start time offset value. 
        `-avoid_negative_ts disabled `,
        // `-strict 2 `, // no longer needed since 2015? https://superuser.com/a/1290320

        // hls
        `-f hls `,
        `-hls_time ${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE} `,
        `-hls_segment_type mpegts `,
        // `-hls_playlist_type event `,
        `-hls_playlist_type vod `,
        `-hls_list_size 0 `,
        `-hls_allow_cache 1 `,
        `-hls_base_url ${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${roomUUID}/ `,
        `-hls_segment_filename '${workDir}%0${(segmentsCount).toString().length}d.ts' `,

        `${workDir}ignore.m3u8`,
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
    */
    console.log(ffmpegString);
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

async function ytdlpMediaInfo(remoteURL) {
    try {
        const bl = await spawn(`yt-dlp`,[`-f`,`b`,`-j`, remoteURL]);
        return JSON.parse(bl.toString());
    } catch (e) {
        // TODO this throws invis errors
        console.log(e.stderr.toString())
    }
}

exports.ytdlpMediaToRoomMetadata = async function ytdlpMediaToRoomMetadata(roomUUID) {
    while (ffmpegJobQueue[roomUUID] === undefined || ffmpegJobQueue[roomUUID]['mediaInfo'] === undefined) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    let ytdlpmediaInfo = await ffmpegJobQueue[roomUUID]['mediaInfo'];
    let mediaInfo = {
        Title: ytdlpmediaInfo.title || ytdlpmediaInfo.webpage_url,
        Year: new Date(ytdlpmediaInfo.timestamp * 1000).getFullYear(),
        // Rated: res.data.OfficialRating,
        // Genre: res.data.Genres.join(", "),
        Runtime: `${Math.round(ytdlpmediaInfo.duration / 60)} mins`,
        Plot: ytdlpmediaInfo.description || '',
        // imdbRating: res.data.CommunityRating,
    };
    if (ytdlpmediaInfo.thumbnail) {
        mediaInfo.Poster = ytdlpmediaInfo.thumbnail;
    }
    return mediaInfo
}

function ytdlpMediaInfoToFfprobe(mediaInfo) {
    // find preferred yt-dlp stream
    // TODO needs to handle catching 1080p and below, and preferring aac audio
    // TODO as well as knowing video and audio codecs, and .split('+') on format_id
    let bestStream;
    let m3u8MaxFilesize = false;
    let manifest_url = '';
    for (let stream of mediaInfo.formats) {
        if (stream.protocol === 'm3u8_native') {
            if (m3u8MaxFilesize === false) {
                m3u8MaxFilesize = stream.filesize_approx;
                manifest_url = stream.manifest_url;
            } else if (m3u8MaxFilesize > stream.filesize_approx) {
                manifest_url = stream.manifest_url;
                // TODO figure out if I care about adaptive.akamaized vs skyfire
            } else if (m3u8MaxFilesize === stream.filesize_approx && manifest_url.includes('adaptive') && !stream.manifest_url.includes('adaptive')) {
                manifest_url = stream.manifest_url;
            }
        }
        if (stream.format_id === mediaInfo.format_id) {
            bestStream = stream;
        }
    }
    console.log("bestStream", bestStream);

    let newMediaInfo = {
        'streams': [
            {
                'avg_frame_rate': bestStream.fps.toString(),
                'FrameCount': (mediaInfo.duration * bestStream.fps).toString(),
                'codec_name': 'unknown',
            },
            {
                'codec_name': 'unknown',
                'channels': 2

            }
        ],
        'format': {
            'bit_rate': 0
        }
    }
    if (m3u8MaxFilesize !== false) {
        newMediaInfo.m3u8 = manifest_url;
    }
    return newMediaInfo;
}

function getMediaSegmentsCountLengthAndFps(mediaInfo) {
    let oldfps = mediaInfo.streams[0].avg_frame_rate
    let fps = oldfps;
    if (fps.includes('/')) {
        let [numerator, denominator] = fps.split('/');
        oldfps = (numerator / denominator);
        fps = Math.round(oldfps);

    }
    // console.log(`Old fps: ${oldfps}, new fps: ${fps}`);

    let videoFramesCount = (mediaInfo.streams[0].FrameCount !== undefined) ? mediaInfo.streams[0].FrameCount : mediaInfo.streams[0].tags['NUMBER_OF_FRAMES'];
    // still undefined? guess a framecount doesn't exist in the video information, so use duration and fps
    if (videoFramesCount === undefined) {
        videoFramesCount = (mediaInfo.format.duration * oldfps);
    }
    // console.log(`videoFramesCount: ${videoFramesCount}`);
    const framesPerSegment = fps * config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE;
    const adjustedFramesPerSegment = (fps !== oldfps) ? (oldfps * config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE) : framesPerSegment;
    const videoDuration = videoFramesCount / oldfps;
    const segmentsCount = Math.ceil(videoFramesCount / adjustedFramesPerSegment);

    // console.log(`segmentsCount: ${segmentsCount}`);

    let segmentsLength = [];
    // for all segments but last one
    for (let i = 0; i < parseInt(segmentsCount) - 1; i++) {
        segmentsLength.push(config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE);
    }
    // last segment which is very likely less than HLS_SEGMENT_SIZE
    videoFramesCount -= (adjustedFramesPerSegment * (parseInt(segmentsCount) - 1))
    // console.log(`videoFramesCount left over = ${videoFramesCount}`);
    segmentsLength.push(videoFramesCount / oldfps);
    return { fps, framesPerSegment, segmentsCount, segmentsLength, videoDuration };
}

async function createHLSPlayList(destination, playlist_filename, roomUUID, mediaInfo, subtitleInfo) {
    const { fps, framesPerSegment, segmentsCount, segmentsLength, videoDuration } = getMediaSegmentsCountLengthAndFps(mediaInfo);

    let playlistM3U8 = `#EXTM3U
#EXT-X-VERSION:3`
    for (let sub of subtitleInfo) {
        // add each subtitle to playlist m3u8
        sub.hls_playlist_name = `${sub.Language}${(sub.IsForced)? `_forced` : ``}${(sub.Title)? `- ${sub.Title}` : ``}`;
        sub.hls_serve_file = sub.DeliveryUrl.split('/Videos/')[1].split('?')[0];
        playlistM3U8 += `\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${sub.hls_playlist_name}",DEFAULT=${sub.IsDefault?'YES':'NO'},AUTOSELECT=NO,URI="${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${roomUUID}/${sub.hls_playlist_name}.m3u8"`
        // playlistM3U8 += `\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${sub.hls_playlist_name}",DEFAULT=${sub.IsDefault?'YES':'NO'},AUTOSELECT=NO,URI="${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${roomUUID}/${sub.hls_playlist_name}.m3u8"`
    }
    playlistM3U8 += `\n#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=${mediaInfo.streams[0].width}x${mediaInfo.streams[0].height}${(subtitleInfo.length) ? `,SUBTITLES="subs"` : ``}
${config.default.publicRuntimeConfig.HLS_STREAM_ROOT}${roomUUID}/stream0.m3u8`


    let segmentM3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${config.default.publicRuntimeConfig.HLS_SEGMENT_SIZE}
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD`;
    for (let i in segmentsLength) {
        segmentM3U8 += `\n#EXTINF:${segmentsLength[i]},\n${i.toString().padStart((segmentsCount).toString().length, '0')}.ts`
    }
    segmentM3U8 += `\n#EXT-X-ENDLIST`;


    for (let sub of subtitleInfo) {
        sub.hls_playlist = `#EXTM3U
#EXT-X-TARGETDURATION:${videoDuration}
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:${videoDuration}
${config.default.publicRuntimeConfig.BASE_URL}/api/jellyfin/subtitlestream/${sub.hls_serve_file}
#EXT-X-ENDLIST`
// TODO this is not agnostic to media source, jellyfin only atm
    }

    await Promise.all([
        fs.promises.writeFile(`${destination}/${playlist_filename}.m3u8`, playlistM3U8),
        fs.promises.writeFile(`${destination}/stream0.m3u8`, segmentM3U8)]);
        // should I retrieve all the subs in parallel?

        // fs.promises.writeFile(`${destination}/${mediaInfo.streams[0].height}p.m3u8`, segmentM3U8)]);
    await Promise.all(
        subtitleInfo.map(async (sub) => {
            fs.promises.writeFile(`${destination}/${sub.hls_playlist_name}.m3u8`, sub.hls_playlist);
        })
    );

    return playlistM3U8;
}

function startffmpegHLSTranscode(ffmpegCommand, destination, roomUUID) {
    // TODO: can send abortsignal
    // const ac = new AbortController();
    // const { signal } = ac;
    // setTimeout(() => ac.abort(), 30000);
    return child_process.exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        // delete ffmpegJobQueue[roomUUID];
        // lol instead of deleting the room ffmpeg object, we will just reset the ffmpeg job when the transcode is finished
        ffmpegJobQueue[roomUUID]['ffmpeg'] = undefined;
        child_process.exec(`touch ${destination}/ffmpeg_finished`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
        });
    });
}

exports.ffmpegConvertSubtitles = async function ffmpegConvertSubtitles(subLocation, filename, extension) {
    const ffmpegCommand = ['-y', '-i',subLocation, '-map', '0:s:0', filename]
    return spawn(`ffmpeg`,ffmpegCommand);
}

exports.generateThumb = async function generateThumb(filename, mediaLocation) {
    const ffmpegCommand = ['-ss', '00:00:30.00', '-i', mediaLocation, '-vframes', '1', `${config.default.publicRuntimeConfig.THUMBS_SERVE_DIR}${filename}.jpg`]
    console.log('generateThumb', ffmpegCommand);
    return await spawn(`ffmpeg`, ffmpegCommand);
}