const API_KEY = 'AIzaSyCw5ACEZuAyCaeA6_990uU7lHrZfVLl7QM'; // YouTube Data API v3의 API 키
let player;
let searchInput = $("#searchInput");
let searchBtn = $("#searchBtn");
let playlist = [];
let currentTrackIndex = 0;
let isYouTubeApiLoaded = false;
let isPlay = false;

// YouTube IFrame Player API 스크립트 로드 완료 시 호출되는 함수
function onYouTubeIframeAPIReady() {
    isYouTubeApiLoaded = true;

    player = new YT.Player("player", {
        height: "0",
        width: "0",
        videoId: "",
        playerlets: {
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1
        },
        events: {
            onReady: onPlayerReady
        }
        
    });

    // 음악이 종료된 경우 다음 트랙 재생
    player.addEventListener("onStateChange", function (event) {
        if (event.data === YT.PlayerState.ENDED) {
            playNextTrack();
        }
    });    
}

// 음악 검색 버튼 클릭
searchBtn.on("click", function () {
    let query = searchInput.val();
    searchMusic(query);
});

// Enter 키 입력 이벤트 핸들러
searchInput.on("keyup", function (event) {
    if (event.keyCode === 13) {
        let query = searchInput.val();
        searchMusic(query);
    }
});

// 검색 결과를 받아오는 함수 (AJAX 요청)
function searchMusic(query) {
    if (!isYouTubeApiLoaded) {
        // YouTube IFrame Player API 스크립트 로드 중이면 대기
        setTimeout(function () {
            searchMusic(query);
        }, 100);
        return;
    }

    $.ajax({
        url: "https://www.googleapis.com/youtube/v3/search",
        type: "GET",
        dataType: "json",
        data: {
            q: query,
            part: "snippet",
            key: API_KEY
        },
        success: function (response) {
            // 검색 결과에서 필요한 정보 추출
            let items = response.items;
            let searchResults = [];

            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                let videoId = item.id.videoId;
                let title = item.snippet.title;
                let thumbnail = item.snippet.thumbnails.default.url;

                // 검색 결과에 추가
                searchResults.push({ videoId: videoId, title: title, thumbnail: thumbnail });
            }
            
            // 검색 결과를 HTML에 추가
            displaySearchResults(searchResults);
        },
        error: function (error) {
            console.log("음악 검색 실패:", error);
        }
    });
}

// 검색 결과
function displaySearchResults(searchResults) {
    let searchResultsContainer = $("#results");
    searchResultsContainer.empty()
    for (let i = 0; i < searchResults.length; i++) {
        let result = searchResults[i];
        let listItem = $("<div class='search-result-item'>");
        listItem.html("<img src='" + result.thumbnail + "' alt='음악 썸네일'>" +
            "<span>" + result.title + " " + "</span>" +
            "<button class='custom-button' id='add' onclick='addToPlaylist(\"" + result.videoId + "\", \"" + result.title + "\", \"" + result.thumbnail + "\")'>Add</button>");
        searchResultsContainer.append(listItem);
    }
}

// 재생목록에 트랙 추가
function addToPlaylist(videoId, trackTitle,thumnail) {
    playlist.push({videoId: videoId, trackTitle: trackTitle, thumnail: thumnail});
    if(playlist.length === 1){
        playTrackByIndex(0);
    }
    // 재생목록 표시 업데이트
    updatePlaylistDisplay();
}

// 재생목록을 업데이트하고 표시하는 함수
function updatePlaylistDisplay() {
    let playlistItems = $("#playlistItems");
    playlistItems.empty();

    for (let i = 0; i < playlist.length; i++) {
        let trackTitle = playlist[i].trackTitle;
        let listItem = $("<li>").text(trackTitle + " ").addClass("playlist");
        let removeButton = $("<button>").text("Remove").addClass("custom-button");
        removeButton.on("click", createRemoveButtonClickHandler(i));
        listItem.append(removeButton);

        listItem.on("click", createTrackClickHandler(i));
        playlistItems.append(listItem);
    }
}

// 재생목록 제거 버튼
function createRemoveButtonClickHandler(index) {
    return function (event) {
        event.stopPropagation(); // 이벤트 버블링 방지
        removeTrackByIndex(index);
    };
}

// 트랙 제거 함수
function removeTrackByIndex(index) {

    playlist.splice(index, 1);
    if(playlist.length === 0){
        $("#currentTrackInfo").empty();
        stopTrack();
    }
    else if (index === currentTrackIndex) {
        playTrackByIndex(index);
    }
    updatePlaylistDisplay();
}

// 트랙 클릭 이벤트 핸들러 생성 함수
function createTrackClickHandler(index) {
    return function () {
        playTrackByIndex(index);
};
}

// 트랙이 변경되었을 때 재생목록 표시 업데이트
function onTrackChange() {
    $("#playlistItems li").removeClass("active");
    $("#playlistItems li:eq(" + currentTrackIndex + ")").addClass("active");
}

// 플레이어 준비되면 음악 재생 및 재생목록 표시 업데이트
function onPlayerReady(event) {
    $("#playBtn").on("click", function () {
        event
            .target
            .playVideo();
    });
    $("#pauseBtn").on("click", function () {
        pauseTrack();
    });
    $("#stopBtn").on("click", function () {
        stopTrack();
    });
    $("#nextBtn").on("click", function () {
        playNextTrack();
    });
    $("#prevBtn").on("click", function () {
        playPreviousTrack();
    });
    $("#shuffleBtn").on("click", function () {
        shufflePlaylist();
    });
    // 플레이어 상태 변경 시 재생목록 표시 업데이트
    player.addEventListener("onStateChange", function (event) {
        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
            onTrackChange();
        }
    });
}

// 트랙 재생
function playTrackByIndex(index) {
    currentTrackIndex = index;
    let videoId = playlist[index].videoId;
    player.loadVideoById({videoId: videoId, suggestedQuality: "small"}); 
    waitUpdate();
}

// 트랙 재생을 할떄까지 대기
function waitUpdate() {
    let checkInterval = setInterval(function () {
        let playerState = player.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) {
            clearInterval(checkInterval);
            updateCurrentTrackinfo();
        }
    }, 1000); // 1초마다 반복
}


//현재 재생정보 업데이트
function updateCurrentTrackinfo() {
        let currentTime = player.getCurrentTime();
        let totalTime = player.getDuration();
        let thumbnail = playlist[currentTrackIndex].thumnail

        let currentTrackInfo = $("#currentTrackInfo");
        currentTrackInfo.empty();
        currentTrackInfo.append("<div><img src='" + thumbnail + "' alt='음악 썸네일'></div>")
        currentTrackInfo.append("<p id='currentTrackTitle' class='currentTrack'></p>");
        currentTrackInfo.append("<p id='currentTime' class='currentTrack'></p>");
        currentTrackInfo.append("<p class='currentTrack'> / </p>");
        currentTrackInfo.append("<p id='totalTime' class='currentTrack'></p>");

        let currentTrackTitle = $("#currentTrackTitle");
        currentTrackTitle.text(playlist[currentTrackIndex].trackTitle + "  ");
        let currentTimeTag = $("#currentTime");
        currentTimeTag.text(formatTime(currentTime))
        let currenttotalTimeTag = $("#totalTime");
        currenttotalTimeTag.text(formatTime(totalTime))

        updateCurrnetTime();
}

function updateCurrnetTime(){
    let currentTime = player.getCurrentTime();
    let currentTimeTag = $("#currentTime");
    currentTimeTag.text(formatTime(currentTime))
    
    // 1초마다 업데이트 반복
    setTimeout(updateCurrnetTime, 1000);
    
}

// 플레이 리스트 셔플
function shufflePlaylist() {
    let cuurentTrack = playlist[currentTrackIndex];
    playlist.splice(currentTrackIndex,1);
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    playlist.unshift(cuurentTrack);
    currentTrackIndex = 0;
    // 재생목록 업데이트
    updatePlaylistDisplay();
}


//시간 포맷 변환
function formatTime(time) {
    let minutes = Math.floor(time / 60);
    let seconds = Math.floor(time % 60);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}

function stopTrack() {
    player.stopVideo();
}

function pauseTrack() {
    player.pauseVideo();
}

// 다음 트랙 재생
function playNextTrack() {
    if (currentTrackIndex < playlist.length - 1) {
        currentTrackIndex++;
        playTrackByIndex(currentTrackIndex);
    }
}

// 이전 트랙 재생
function playPreviousTrack() {
    if (currentTrackIndex > 0) {
        currentTrackIndex--;
        playTrackByIndex(currentTrackIndex);
    }
}


