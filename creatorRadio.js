/**
 * @license
 * True Audio Player 1.3.1
 * Audio player plugin for creating robust audio player solutions
 * https://upliftwebdesign.com/true-audio-player
 * 
 * Copyright 2024 Uplift Web Design LLC
 * 
 * Released under the GNU General Public License v3.0 License
 * 
 * Released on: December 30, 2024
 */
!function(t, e, n, i) {

    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    var r = {
        autoplay: !0,
        crossfadeDuration: 2 // seconds for fade in/out
    };
    function a(t, e, i, r, a, s) {
        var u = this;
        this.id = o(),
        this.$elem = i,
        this.targetSetId = r,
        this.$elem.attr("data-true-audio-player-song-id", this.id),
        this.$parentElem,
        this.audio = new Audio,
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";
        var l = n.createElement("source");
        l.setAttribute("src", e),
        a && (a = a.replace("\\", "/"),
        l.setAttribute("type", a)),
        this.audio.append(l),
        this.title = "",
        this.artist = "",
        this.album = "",
        this.genre = "",
        this.type = "",
        this.durationString = "0:00",
        this._thumbnail = "",
        this._thumbnailBlob = "",
        this._thumbnailBlobUrl = "",
        this._isCrossfading = false,

        this.getThumbnail = function() {
            return this._thumbnail
        }
        ,
        this.getThumbnailBlob = function() {
            return this._thumbnailBlob
        }
        ,
        this.getThumbnailBlobUrl = function() {
            return this._thumbnailBlobUrl
        }
        ,
        this.setThumbnail = function(t) {
            this._thumbnail = t
        }
        ,
        this.getAudioContext = function() {
            return audioContext;
        }
        ,   
        this.audio.addEventListener("timeupdate", function(e) {
            if (t.isDragging)
                return !1;
            var n = t.getCurrentSong().audio.currentTime
              , i = t.getCurrentSong().audio.duration;
            t.updateSongDisplayTime(n, i)

              // Start crossfade when approaching end
            const fadeBeforeEnd = t.settings.crossfadeDuration || 2;
            if (i && n >= i - fadeBeforeEnd && !t._fadeStarted) {
                t._fadeStarted = true;
                t.playNextSong(false);
            }
             else {
                        t.preloadSong();
                    }
        }),
        this.audio.addEventListener("volumechange", function(e) {
            var n = 100 * e.srcElement.volume;
            t.$volumeBar.width(n + "%")
        }),
        this.audio.addEventListener("canplay", function() {}),
        this.audio.addEventListener("play", function() {
            t.targetSets[u.targetSetId] && t.targetSets[u.targetSetId].removeClass("is-buffering"),
            t.setPlayerState("playing", u),
            "mediaSession"in navigator && (navigator.mediaSession.playbackState = "playing")

            if (!t._audioContext) {
                t._audioContext = new (window.AudioContext || window.webkitAudioContext)();
                t._audioContext.onstatechange = () => {
                
                    if (t._audioContext.state === 'interrupted') {
                        console.log('AudioContext was interrupted by the UA.');
                        t._audioContext.resume().catch(() => {});
                        // Handle the pause in your application logic
                      } 
                    else if (t._audioContext.state === 'running') {
                        console.log('AudioContext is running.');
                        // Resume your application logic
                    }
                    // iOS Safari fix
                    else if (t._audioContext.state === 'suspended') {
                        console.log('AudioContext was suspended by the UA.');
                        t._audioContext.resume().catch(() => {});
                    }
                };
            }
            
            
            if (true) {
                clearInterval(t._iosTimer);
                t._iosTimer = setInterval(() => {

                    if (t.isDragging || t.getPlayerState() == "paused") return;
                  
                    const currentTime = Math.min(
                        audioContext.currentTime - (t.getCurrentSong().startTime || 0 ) + t.tempCurrentTime,
                        t.getCurrentSong().audio.duration
                    );
                    
                    var n = currentTime
                      , i = t.getCurrentSong().audio.duration;
                    t.updateSongDisplayTime(n, i)
        
                    const fadeBeforeEnd =  t.getCurrentSong().fadeOutTime || t.settings.crossfadeDuration || 2;
                    if (currentTime >= t.getCurrentSong().audio.duration - fadeBeforeEnd) {
                        if (t._fadeStarted) return;
                        t._fadeStarted = true;
                        t.playNextSong(false);
                    } else {
                        t.preloadSong(t.getNextSong(),0);
                    }
                }, 200);
            }
        }),
        this.audio.addEventListener("pause", function() {
            t.setPlayerState("paused", u),
            "mediaSession"in navigator && (navigator.mediaSession.playbackState = "paused")
            if (t._iosTimer) clearInterval(t._iosTimer);
        }),
        this.audio.addEventListener("waiting", function() {
            t.targetSets[u.targetSetId] && t.targetSets[u.targetSetId].addClass("is-buffering")
        }), 
    
        this.audio.addEventListener("ended", function() {
          /*  if (t._isCrossFading) return;
            
            for (var e = truePlayerEventManager.getEventWatchers("audioEnded"), n = 0; n < e.length; n++)
                e[n].callback(t);
            1 == t.songs.length || t.isDragging || 0 == t.settings.autoplay ? t.stopCurrentSong() : t.playNextSong() */
            if (isIOS && t._iosTimer) clearInterval(t._iosTimer);
        }), 
        this.audio.addEventListener("loadedmetadata", function() {
            var e = parseInt(u.audio.duration / 60, 10)
              , n = parseInt(u.audio.duration % 60);
            n = n >= 10 ? n : "0" + n,
            u.durationString = e + ":" + n,
            u.$parentElem && u.$parentElem.find('[tmplayer-interaction="populate-duration"]').text(u.durationString),
            t.getCurrentSong() == u && t.$duration.text(u.durationString)
        })
    }
    function o() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
    function s(e, n) {
        this.$elem = t(e),
        this.settings = t.extend({}, r, n),
        this._defaults = r,
        this.init()
        
    }
    s.prototype = {
        init: function() {
            var e = this;
            e.id = o(),
            e.name = e.$elem.attr("tmplayer-init"),
            e.isDragging = !1,
            e.songs = [],
            e.targetSets = {},
            e._volume = 1,
            e._playerState = "stopped",
            e._currentSongIndex = -1,
            e.tempCurrentTime = 0,
            this.$songName = this.$elem.find('[tmplayer-element="title"]').attr("tmplayer-interaction", "monitor-state"),
            this.$thumbnail = this.$elem.find('[tmplayer-element="thumbnail"]').attr("tmplayer-interaction", "monitor-state"),
            this.$albumName = this.$elem.find('[tmplayer-element="album"]').attr("tmplayer-interaction", "monitor-state"),
            this.$artistName = this.$elem.find('[tmplayer-element="artist"]').attr("tmplayer-interaction", "monitor-state"),
            this.$genre = this.$elem.find('[tmplayer-element="genre"]').attr("tmplayer-interaction", "monitor-state"),
            this.$type = this.$elem.find('[tmplayer-element="type"]').attr("tmplayer-interaction", "monitor-state"),
            this.playButton = this.$elem.find('[tmplayer-button="play"]'),
            this.pauseButton = this.$elem.find('[tmplayer-button="pause"]'),
            this.nextButton = this.$elem.find('[tmplayer-button="next"]'),
            this.previousButton = this.$elem.find('[tmplayer-button="previous"]'),
            this.stopButton = this.$elem.find('[tmplayer-button="stop"]'),
            this.volumeUpButton = this.$elem.find('[tmplayer-button="volume-up"]'),
            this.volumeDownButton = this.$elem.find('[tmplayer-button="volume-down"]'),
            this.volumeMuteButton = this.$elem.find('[tmplayer-button="volume-mute"]'),
            this.volumeHalfButton = this.$elem.find('[tmplayer-button="volume-half"]'),
            this.volumeFullButton = this.$elem.find('[tmplayer-button="volume-full"]'),
            this.volumeToggleButtons = t(t.map([e.volumeMuteButton, e.volumeHalfButton, e.volumeFullButton], function(t) {
                return t.get()
            })),
            this.$progressBarWrapper = this.$elem.find('[tmplayer-element="progress-bar-wrapper"]'),
            this.$progressBar = this.$elem.find('[tmplayer-element="progress-bar"]'),
            this.$duration = this.$elem.find('[tmplayer-element="duration"]'),
            this.$elapsed = this.$elem.find('[tmplayer-element="elapsed"]').text("0:00"),
            this.$volumeBarWrapper = this.$elem.find('[tmplayer-element="volume-bar-wrapper"]'),
            this.$volumeBar = this.$elem.find('[tmplayer-element="volume-bar"]'),
            this.$clickTargets = t("[tmplayer-click]"),
            this.$ajaxContainers = t('[tmplayer-dynamic-content="' + e.name + '"]'),
            this.targetSets.player = this.$elem.find('[tmplayer-interaction="monitor-state"]'),
            this.pauseButton.hide(),
            this.$progressBar.width("0%"),
            this.$volumeBar.width("100%"),
            this.initAllExternalSongs(),
            this.initAllEmbeddedSongs(),
            0 != e.songs.length ? (this.playButton.on("click", function() {
                e.playCurrentSong()
            }),
            this.stopButton.on("click", function() {
                e.stopCurrentSong()
            }),
            this.pauseButton.on("click", function() {
                e.pauseCurrentSong()
            }),
            this.volumeUpButton.on("click", function() {
                var t = e.getVolume() + .1;
                e.setVolume(t)
            }),
            this.volumeDownButton.on("click", function() {
                var t = e.getVolume() - .1;
                e.setVolume(t)
            }),
            this.volumeToggleButtons.on("click", function() {
                e.getVolume() > 0 ? e.setVolume(0) : e.setVolume(1)
            }),
            this.nextButton.on("click", function() {
                e.playNextSong(true)
            }),
            this.previousButton.on("click", function() {
                e.playPreviousSong()
            }),
            this.$clickTargets.on("click", function() {
                var n = t(this).attr("tmplayer-click");
                switch (n) {
                case "play":
                    e.playCurrentSong();
                    break;
                case "pause":
                    e.pauseCurrentSong();
                    break;
                case "stop":
                    e.stopCurrentSong();
                    break;
                default:
                    console.error(n + " does not exist on true music player.")
                }
            }),
            this.setVolume(1),
            this.initProgressBarEvents(),
            this.initVolumeBarEvents(),
            this.initAjaxLoadObserver(),
            this.initMediaAPIActions(),
            this.setCurrentSong(0)) : console.error("There are no songs in the player.")

            document.addEventListener("touchstart", () => {
                     audioContext.resume(), { once: true };
                   // if (!this._iosUnlocked) this.unlockAudioContext();
                }, { once: true });
           
        },

        preloadPlayCurrentSong(fadeTime) {
            const song = this.getCurrentSong();
            const player = this;
            if (!song || song.audioBuffer) player.playSong(song, 0, 0, true); // already preloaded
        
            fetch(song.audio.currentSrc)
                .then(res => res.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(buffer => {
                    song.audioBuffer = buffer;

                    if ("playing" == this.getPlayerState()) {
                        player.playSong(song,0, 0, true);
                    }
                })
                .catch(err => console.warn("Failed to preload song:", err));
        },
        
        preloadSong(song, depth=0) {
            const player = this;
            if (!song || song.preloading) return; // already preloading

            // Already loaded
            if (song.audioBuffer) {
                // Cascade down
                if ( depth < 3) {
                    index = this.getCurrentSongIndex();
                    let nextSong = this.getSongAt(index + 2);
                    if (!nextSong.audioBuffer) {
                         return this.preloadSong(nextSong, depth + 1);
                    } else {
                        nextSong = this.getSongAt(index + 3)
                        return this.preloadSong(nextSong, depth + 1);
                    }
           
                } else { return; }
            } 
            
            song.preloading = true;
        
            fetch(song.audio.currentSrc)
                .then(res => res.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(buffer => {
                    song.audioBuffer = buffer;
                    song.preloading = false;
                    
                    if (song.shouldPlay && "playing" == this.getPlayerState()) {
                        this.playSong(song,0, 0, false);
                        song.shouldPlay = false;
                    }
                })
                .catch(err => {
                    console.warn("Failed to preload song:", err);
                    song.preloading = false;
                })
        },
        
        getVolume: function() {
            return this._volume
        },
        setVolume: function(t) {
            t < 0 ? t = 0 : t > 1 && (t = 1),
            this.volumeMuteButton.hide(),
            this.volumeHalfButton.hide(),
            this.volumeFullButton.hide(),
            0 == (0 == t ? this.volumeMuteButton.show() : t < .66 ? this.volumeHalfButton.show() : this.volumeFullButton.show()).length && this.volumeFullButton.show(),
            this._volume = t,
            this.getCurrentSong().audio.volume = t
        },
        playCurrentSong: function() {
            e.truePlayerManager.activePlayer && e.truePlayerManager.activePlayer != this && e.truePlayerManager.activePlayer.pauseCurrentSong(),
            this.pauseButton.show(),
            this.playButton.hide(),
            this.getCurrentSong().audio.volume = this.getVolume(),
            e.truePlayerManager.activePlayer = this,
            this.settings.crossfadeDuration = this.fadeTime( this.getCurrentSong().type, this.getNextSong().type);
            this.preloadPlayCurrentSong(this.settings.crossfadeDuration);
             this.setPlayerState("playing", this.getCurrentSong());
        },
        stopCurrentSong: function() {
            this.pauseCurrentSong(),
            this.stopSong(this.getCurrentSong(), true),
            this.stopSong(this.getNextSong(), false),
            this.getCurrentSong().audio.currentTime = 0
            this.setPlayerState("paused", this.getCurrentSong());
        },
        pauseCurrentSong: function() {
            
            this.pauseButton.hide(),
            this.playButton.show(),
            e.truePlayerManager.activePlayer == this && (e.truePlayerManager.activePlayer = null,
            e.truePlayerManager.previouslyActivePlayer = this),
            this.stopSong(this.getCurrentSong(), true),
            this.stopSong(this.getNextSong(), false)
            this.setPlayerState("paused", this.getCurrentSong());
           // this.getCurrentSong().audio.pause()
        },
        togglePauseCurrentSong: function() {
            "playing" == this.getPlayerState() ? this.pauseCurrentSong() : this.playCurrentSong()
        },
        toggleStopCurrentSong: function() {
            "playing" == this.getPlayerState() ? this.stopCurrentSong() : this.playCurrentSong()
        },
        getCurrentSong: function() {
            return this.getSongAt(this.getCurrentSongIndex());
        },
        getNextSong: function() {
            return this.getSongAt(this.getCurrentSongIndex() + 1);
        },
        getSongAt: function(index) {
            index = this.songs[index] ? index : 0;
            return this.songs[index];
        },
        setCurrentSong: function(t, l) {
            var e = this.songs[t];
            if (!e) return console.error("Song with index " + t + " not found."), !1;
   
            var n = this.songs[this._currentSongIndex];
            n && n.$parentElem && n.targetSetId != e.targetSetId && (n.$parentElem.removeClass("is-current"),
            this.targetSets[n.targetSetId].removeClass("is-current")),
            this._currentSongIndex = t,
            e.$parentElem && (e.$parentElem.addClass("is-current"),
            this.targetSets[e.targetSetId].addClass("is-current"));
            var i = e.getThumbnail();
            i ? this.$thumbnail.attr("src", i) : this.$thumbnail.removeAttr("src"),
            this.$songName.text(e.title),
            this.$albumName.text(e.album),
            this.$artistName.text(e.artist),
            this.$duration.text(e.durationString),
            this.$genre.text(e.genre)
        },
        initProgressBarEvents: function() {
            var n = this;
            n.$progressBarWrapper.on("touchstart", function(i) {
                if (i.preventDefault(),
                0 == n.getCurrentSong().audio.readyState)
                    return !1;
                n.isDragging = !0;
                var r = n.scrubSong(i)
                  , a = n.getCurrentSong().audio.duration;
                n.updateSongDisplayTime(r, a),
                t(e).on("touchmove.trueAudioPlayer", function(t) {
                    var e = n.scrubSong(t);
                    n.updateSongDisplayTime(e, a)
                }),
                t(e).one("touchend", function() {
                    t(e).off("touchmove.trueAudioPlayer"),
                   // n.getCurrentSong().audio.currentTime = n.tempCurrentTime,
                    n.playSong(n.getCurrentSong(), 0, n.tempCurrentTime, true);
                    n.isDragging = !1
                })
            }),
            n.$progressBarWrapper.on("mousedown", function(i) {
                if (i.preventDefault(),
                0 == n.getCurrentSong().audio.readyState)
                    return !1;
                n.isDragging = !0;
                var r = n.scrubSong(i)
                  , a = n.getCurrentSong().audio.duration;
                n.updateSongDisplayTime(r, a),
                t(e).on("mousemove.trueAudioPlayer", function(t) {
                    var e = n.scrubSong(t);
                    n.updateSongDisplayTime(e, a)
                }),
                t(e).one("mouseup", function() {
                    t(e).off("mousemove.trueAudioPlayer"),
                    //n.getCurrentSong().audio.currentTime = n.tempCurrentTime,
                    n.playSong(n.getCurrentSong(), 0, n.tempCurrentTime, true);
                    n.isDragging = !1
                })
            })
        },
        initVolumeBarEvents: function() {
            var n = this;
            n.$volumeBarWrapper.on("mousedown", function(i) {
                i.preventDefault(),
                n.scrubVolume(i),
                t(e).on("mousemove.trueAudioPlayer", function(t) {
                    n.scrubVolume(t)
                }),
                t(e).one("mouseup", function() {
                    t(e).off("mousemove.trueAudioPlayer")
                })
            }),
            n.$volumeBarWrapper.on("touchstart", function(i) {
                i.preventDefault(),
                n.scrubVolume(i),
                t(e).on("touchmove.trueAudioPlayer", function(t) {
                    n.scrubVolume(t)
                }),
                t(e).one("touchend", function() {
                    t(e).off("touchmove.trueAudioPlayer")
                })
            })
        },
        scrubSong: function(t) {
            var e = "touchstart" == t.type || "touchmove" == t.type ? t.touches[0].clientX : t.clientX
              , n = this.$progressBarWrapper.width()
              , i = (e - this.$progressBarWrapper.offset().left) / n;
            i < 0 ? i = 0 : i > 1 && (i = 1);
            var r = this.getCurrentSong().audio.duration * (i = i < 0 ? 0 : i);
            return this.tempCurrentTime = r,
            r
        },
        scrubVolume: function(t) {
            var e = "touchstart" == t.type || "touchmove" == t.type ? t.touches[0].clientX : t.clientX
              , n = this.$volumeBarWrapper.width()
              , i = (e - this.$volumeBarWrapper.offset().left) / n;
            this.setVolume(i)
        },  

        // utility to safely extract a label for the song (optional)
        getSongLabel(song) {
            if (!song) return 'unknown-track';
            
              const name =
                song.name ||
                song.id 
                'unknown-track';
            
              // try to pull duration from common fields
              const duration =
                song.audio?.duration ||
                song.audioBuffer?.duration ||
                null;
            
              return duration
                ? `${name} (duration: ${duration.toFixed?.(2) ?? duration}s)`
                : name;
        },
        
        // simple logger you can later swap with a backend call
        logFadeEvent(direction, details) {
          // You can change this to send to your server instead of console
          console.log(`[${direction.toUpperCase()}]`, {
            ts: performance.now(), // or Date.now()
            ...details,
          });
        },
        
        fadeIn(type, song, startTime, fadeDuration) {

          if(!song.gainNode) {
                this.logFadeEvent('fadeIn', {
                  warning: 'Missing gainNode',
                  type,
                  song: this.getSongLabel(song),
                  startTime,
                  fadeDuration,
                });
              
              return;
          }

          const g = song.gainNode.gain;
          const beforeValue = g.value;

          let rampType = null;
          let targetValue = null;
          let endTime = null;

         //   const now = audioContext.currentTime;
        //    const epsilon = 0.001; // 10ms safety margin

       //   const safeStart = Math.max(startTime, now + epsilon);
         // endTime = safeStart + duration;
            
          g.cancelScheduledValues(startTime);
          g.setValueAtTime(0.001, startTime);
        
          switch (type) {
            case 'liner':
            case 'show':
            rampType = 'exponential';
               targetValue = 1;
               endTime = startTime;
              //g.exponentialRampToValueAtTime(targetValue, endTime);
              g.setValueAtTime(1, startTime);
              break;
            case 'music':
            case 'promo':
            default:
              rampType = 'linear';
              targetValue = 1;
              endTime = startTime + fadeDuration;
              g.linearRampToValueAtTime(targetValue, endTime);
          }

        this.logFadeEvent('fadeIn', {
            type,
            song: this.getSongLabel(song),
            preloading: song.preloading,
            audioBigger: song._bufferSource,
            startTime,
            fadeDuration,
            rampType,
            targetValue,
            endTime,
            beforeValue,
            afterSetValueAtTime: 0.001,
          });
            
        },

        fadeOut(type, song, fadeDuration) {
            if(!song.gainNode) {
                this.logFadeEvent('fadeOut', {
                  warning: 'Missing gainNode',
                  type,
                  song: this.getSongLabel(song),
                  startTime,
                  fadeDuration,
                });
              
              return;
          }

          const startTime = Math.max(0,  this.getSongEndTime(song) - fadeDuration);

          const g = song.gainNode.gain;
          const beforeValue = g.value;
          let rampType = null;
          let targetValue = null;
          let endTime = null;
    
          g.cancelScheduledValues(startTime);
          g.setValueAtTime(g.value, startTime);
        
          switch (type) {
            case 'music':
              rampType = 'exponential';
              targetValue = 0.001;
              endTime = startTime + fadeDuration;
              g.exponentialRampToValueAtTime(targetValue, endTime);
              break;
            case 'liner':
            case 'show':
                rampType = 'none';
                targetValue = 1;
                endTime = startTime;
                //g.exponentialRampToValueAtTime(targetValue, endTime);
                break;
            case 'promo':
            default:
              rampType = 'linear';
              targetValue = 0.001;
              endTime = startTime + fadeDuration;
              g.linearRampToValueAtTime(0, startTime + fadeDuration);
          }

          this.logFadeEvent('fadeOut', {
            type,
            song: this.getSongLabel(song),
            startTime,
            fadeDuration,
            rampType,
            targetValue,
            endTime,
            beforeValue,
            afterSetValueAtTime: beforeValue,
          });
        }, 

        fadeTime(outType, inType) {
          switch (outType) {
            case 'promo':
            case 'music':
              return this.settings.crossfadeDuration;
              break;
            case 'liner':
            case 'show':
                switch (inType) {
                    case 'music':
                    case 'promo':
                        return 1.5;
                    default:
                      return 0.5;
              }
            default:
               return this.settings.crossfadeDuration;
          }
        }, 
        getSongEndTime(song) {
          // when source.start(startAt, offset)
          const startedAt = song.startTime || audioContext.currentTime;      // audioContext.currentTime when started
          const offset = song.offset || this.tempCurrentTime;               // seconds into the track (resume)
          const duration = song.audio?.duration || 0;
        
          return startedAt + (duration - offset);
        },
        playSong: function(song, fadeTime = 2, offset = 0, dispatch=false) {

            this.stopSong(song, false);
            const ctx = audioContext;
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            source.buffer = song.audioBuffer;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            song._bufferSource = source;
            song.gainNode = gainNode;
            song.startTime = ctx.currentTime;
            song.offset = offset;

            if(!song.preloading) {
              song.started = true;
              source.start(song.startTime, offset);
              if (fadeTime > 0) {
                    this.fadeIn(song.type, song, song.startTime, fadeTime);
                } else {
                    gainNode.gain.setValueAtTime(1, song.startTime);
              
                }
            } else {
                song.shouldPlay = true;  
            }
      

            if(dispatch) {
                const playEvent = new Event('play', { bubbles: true, cancelable: true })
                song.audio.dispatchEvent(playEvent);
            }
        },

        stopSong: function(song, dispatch=false) {
          if (song._bufferSource) {
               if (song.started) {
                song._bufferSource.stop();
               }
                song.started = false;
                song._bufferSource.disconnect();                
                song._bufferSource = null;  
          }

        song.offset = 0;

            if(dispatch) {
                const pauseEvent = new Event('pause', { bubbles: true, cancelable: true })
                song.audio.dispatchEvent(pauseEvent);
            }

        },
        playNextSong: function(skip=false) {
            this.tempCurrentTime = 0;
            
           if (this.songs.length <= 1) return false;
            const currentSong = this.getCurrentSong();
            const currentIndex = this.getCurrentSongIndex();
            const nextIndex = this.songs[currentIndex + 1] ? currentIndex + 1 : 0;
            const nextSong = this.getNextSong()
            currentSong.fadeOutTime = this.fadeTime(currentSong.type, nextSong.type);
            nextSong.fadeInTime = currentSong.fadeOutTime ;
            const fadeTime = currentSong.fadeOutTime || this.settings.crossfadeDuration || 2;
            // Mark that crossfade is in progres
            this._isCrossfading = true;
    
            // Reuse a single AudioContext per crossfade
            const context = currentSong.getAudioContext();
            
            if(skip) {
                this.stopSong(currentSong, false);
            } else {
                this.fadeOut(currentSong.type, currentSong, fadeTime);
            }

            this.playSong(nextSong, fadeTime, 0, true);
            
            // Stop old track after fade completes
            setTimeout(() => {
                this.stopSong(currentSong,false);
                this.setCurrentSong(nextIndex, false);
                this.setPlayerState("playing", nextSong);
                this._isCrossfading = false;
                this._fadeStarted = false;
            }, fadeTime * 1000);
            
        },
        setPlayerState: function(t, e) {
            if (t == this._playerState)
                return !1;
            this.$elem.removeClass("is-playing is-paused");
            var n = this.targetSets.player.removeClass("is-playing is-paused")
              , i = e.$parentElem;
            if (i) {
                i.removeClass("is-playing is-paused");
                var r = this.targetSets[e.targetSetId].removeClass("is-playing is-paused")
            }
            switch (t) {
            case "playing":
                this.$elem.addClass("is-playing"),
                n.addClass("is-playing"),
                i && (i.addClass("is-playing"),
                r.addClass("is-playing")),
                "mediaSession"in navigator && (navigator.mediaSession.metadata = new MediaMetadata({
                    title: e.title,
                    artist: e.artist,
                    album: e.album
                })),
                this._playerState = "playing";
                break;
            case "paused":
                this.$elem.addClass("is-paused"),
                n.addClass("is-paused"),
                i && (i.addClass("is-paused"),
                r.addClass("is-paused")),
                this._playerState = "paused";
                break;
            default:
                this._playerState = "stopped"
            }
        },
        getPlayerState: function() {
            return this._playerState
        },
        getCurrentSongIndex: function() {
            return this._currentSongIndex
        },
        updateSongDisplayTime: function(t, e) {
            var n = t / e * 100
              , i = parseInt(t / 60, 10)
              , r = parseInt(t % 60);
            r = r >= 10 ? r : "0" + r,
            this.$elapsed.text(i + ":" + r),
            this.$progressBar.width(n + "%")
        },
        initAjaxLoadObserver: function() {
            var t = this;
            t.$ajaxContainers.each(function(e, n) {
                new MutationObserver(function(e) {
                    e.forEach(function(e) {
                        e.addedNodes.forEach(function(e) {
                            e.getAttribute("tmplayer-parent") == t.name && t.initExternalSong(e)
                        })
                    })
                }
                ).observe(n, {
                    subtree: !1,
                    childList: !0
                })
            })
        },
        initExternalSong: function(e) {
            var n = this
              , i = t(e)
              , r = o();
            n.targetSets[r] = i.find('[tmplayer-interaction="monitor-state"]'),
            i.find('[tmplayer-action="none"]').on("click", function(t) {
                t.stopPropagation()
            });
            var a = [i.find('[tmplayer-action="toggle"]')];
            "toggle" == i.attr("tmplayer-action") && a.push(i);
            var s = t.map(a, function(t) {
                return t.get()
            });
            t(s).on("click", function(t) {
                var e = n.songs.map(function(t, e) {
                    return songMap = {
                        globalIndex: e,
                        song: t
                    }
                }).filter(function(t) {
                    return t.song.targetSetId == r
                })
                  , i = n.getCurrentSong().id;
                e.filter(function(t) {
                    return t.song.id == i
                }).length > 0 ? n.togglePauseCurrentSong() : (n.stopCurrentSong(),
                n.setCurrentSong(e[0].globalIndex, true),                                         
                n.playCurrentSong())
            }),
            t(e).find('[tmplayer-element="audio"]').hide().each(function(t, i) {
                n.grabAndSetSongData(i, e, r)
            })
        },
        initAllEmbeddedSongs: function() {
            var t = this;
            t.$elem.find('[tmplayer-element="audio"]').hide().each(function(e, n) {
                t.grabAndSetSongData(n)
            })
        },
        initAllExternalSongs: function() {
            var e = this;
            t('[tmplayer-parent="' + e.name + '"]').each(function(t, n) {
                e.initExternalSong(n)
            })
        },
        grabAndSetSongData: function(e, n, i) {
            var r = t(e)
              , o = n ? t(n) : void 0
              , s = r.children('[tmplayer-meta="audio-url"]').text()
              , u = r.children('[tmplayer-meta="audio-type"]').text()
              , l = r.children('[tmplayer-meta="preload"]').text()
              , h = new a(this,s,r,i,u,l);
            h.$parentElem = o,
            h.title = r.children('[tmplayer-meta="title"]').text(),
            h.artist = r.children('[tmplayer-meta="artist"]').text(),
            h.genre = r.children('[tmplayer-meta="genre"]').text(),
            h.album = r.children('[tmplayer-meta="album"]').text(),
            h.type = r.children('[tmplayer-meta="type"]').text(),
            r.children('[tmplayer-meta="thumbnail"]').text() ? h.setThumbnail(r.children('[tmplayer-meta="thumbnail"]').text()) : r.children('[tmplayer-meta="thumbnail"]').attr("src") && h.setThumbnail(r.children('[tmplayer-meta="thumbnail"]').attr("src")),
            this.songs.push(h)
        },
        initMediaAPIActions: function() {
            var t = this
              , e = [["play", function() {
                t.playCurrentSong()
            }
            ], ["pause", function() {
                t.pauseCurrentSong()
            }
            ], ["previoustrack", function() {
                t.playPreviousSong()
            }
            ], ["nexttrack", function() {
                t.playNextSong(true)
            }
            ], ["stop", function() {
                t.stopCurrentSong()
            }
            ], ["seekbackward", function(e) {
                var n = e.seekOffset || 10;
                t.getCurrentSong().audio.currentTime = Math.max(t.getCurrentSong().audio.currentTime - n, 0)
            }
            ], ["seekforward", function(e) {
                var n = e.seekOffset || 10;
                t.getCurrentSong().audio.currentTime = Math.max(t.getCurrentSong().audio.currentTime + n, t.getCurrentSong().audio.duration)
            }
            ], ["seekto", function(e) {
                t.getCurrentSong().audio.currentTime = e.seekTime
            }
            ]];
            for (var [n,i] of e)
                try {
                    navigator.mediaSession.setActionHandler(n, i)
                } catch (t) {
                    console.log("The media session action " + n + " is not supported yet.")
                }
        },
        reinitSongs: function() {
            this.songs = [],
            this.initAllEmbeddedSongs(),
            this.initAllExternalSongs()
        }
    },
    t.fn.extend({
        trueAudioPlayer: function(e) {
            var n = {
                getName: function() {
                    return this.name
                },
                pause: function() {
                    this.pauseCurrentSong()
                },
                stop: function() {
                    this.stopCurrentSong()
                },
                play: function(t) {
                    this.stopCurrentSong(),
                    t && this.setCurrentSong(t, true),
                    this.playCurrentSong()
                },
                togglePause: function() {
                    this.togglePauseCurrentSong()
                },
                toggleStop: function() {
                    this.toggleStopCurrentSong()
                },
                reinitSongs: function() {
                    this.reinitSongs()
                }
            };
            return n[e] ? n[e].apply(t(this).data("plugin_trueAudioPlayer"), Array.prototype.slice.call(arguments, 1)) : "object" != typeof e && e ? void console.error("Method " + e + " does not exist on True Audio Player") : this.each(function() {
                t.data(this, "plugin_trueAudioPlayer") || t.data(this, "plugin_trueAudioPlayer", new s(this,e))
            })
        }
    }),
    e.truePlayerEventManager = new function() {
        this.eventWatchers = [],
        this.addEventWatcher = function(t, e) {
            this.eventWatchers.push({
                eventName: t,
                callback: e
            })
        }
        ,
        this.getEventWatchers = function(t) {
            return this.eventWatchers.filter(function(e) {
                return e.eventName == t
            })
        }
    }
    ,
    e.truePlayerManager = new function() {
        function e(t) {
            return t.replace(/\s+/g, "-").toLowerCase()
        }
        this.activePlayer = null,
        this.allPlayers = {},
        this.previouslyActivePlayer = null,
        this.initializePlayers = function() {
            var n = this;
            t("[tmplayer-init]").each(function(i, r) {
                var a = t(r)
                  , o = {
                    autoplay: "false" != a.attr("tmplayer-autoplay")
                };
                a.trueAudioPlayer(o);
                var s = t(r).trueAudioPlayer("getName")
                  , u = e(s);
                u && (n.allPlayers[u] ? console.warn("An audio player with name " + s + " already exists. Fix the issue or you may experience problems.") : n.allPlayers[u] = t(r))
            })
        }
        ,
        this.pauseActivePlayer = function() {
            this.activePlayer && this.activePlayer.pauseCurrentSong()
        }
        ,
        this.stopActivePlayer = function() {
            this.activePlayer && this.activePlayer.stopCurrentSong()
        }
        ,
        this.togglePauseActivePlayer = function(t) {
            var e;
            (e = this.activePlayer ? this.activePlayer.name : this.previouslyActivePlayer ? this.previouslyActivePlayer.name : t) ? this.togglePause(e) : console.warn("No player to toggle pause on")
        }
        ,
        this.toggleStopActivePlayer = function(t) {
            var e;
            (e = this.activePlayer ? this.activePlayer.name : this.previouslyActivePlayer ? this.previouslyActivePlayer.name : t) ? this.toggleStop(e) : console.warn("No player to toggle pause on")
        }
        ,
        this.pause = function(t) {
            var n = e(t)
              , i = this.allPlayers[n];
            i ? i.trueAudioPlayer("pause") : console.warn("Player named " + n + " does not exist")
        }
        ,
        this.stop = function(t) {
            var n = e(t)
              , i = this.allPlayers[n];
            i ? i.trueAudioPlayer("stop") : console.warn("Player named " + n + " does not exist")
        }
        ,
        this.togglePause = function(t) {
            var n = e(t)
              , i = this.allPlayers[n];
            i ? i.trueAudioPlayer("togglePause") : console.warn("Player named " + n + " does not exist")
        }
        ,
        this.toggleStop = function(t) {
            var n = e(t)
              , i = this.allPlayers[n];
            i ? i.trueAudioPlayer("toggleStop") : console.warn("Player named " + n + " does not exist")
        }
        ,
        this.play = function(t, n) {
            var i = e(t)
              , r = this.allPlayers[i];
            r ? r.trueAudioPlayer("play", n) : console.warn("Player named " + i + " does not exist")
        }
        ,
        this.reinitSongs = function(t) {
            var n = e(t)
              , i = this.allPlayers[n];
            i ? i.trueAudioPlayer("reinitSongs") : console.warn("Player named " + n + " does not exist")
        }
    }
    ,
    e.truePlayerManager.initializePlayers();

    console.log(`%cTrue Audio Player`, ["font-size: 1.25rem", "font-weight: bold", "line-height: 1.3", "font-family: Montserrat, Poppins, Helvetica, sans-serif", "color: rgb(33, 33, 33)", "background: rgb(206, 234, 104)", "padding: 0.75rem 1rem", "border-radius: 0.25rem"].join(";"), '\n\nThis website uses the True Audio Player by Uplift Web Design. For documentation, visit https://www.upliftwebdesign.com/true-audio-player/getting-started');
}($, window, document);
