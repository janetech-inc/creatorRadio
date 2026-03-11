/**
 * @license
 * Creator Radio Audio Player 1.0.3 (two-deck iOS-safe patch)
 * Audio player plugin for creating robust audio player solutions
 * https://creatorradioai.com
 *
 * Released under the GNU General Public License v3.0 License
 *
 * Released on: December 30, 2025
 */
!function ($, window, document, undefined) {

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    audioContext.onstatechange = () => {
        console.log("AudioContext state:", audioContext.state);
    };

    const defaults = {
        autoplay: !0,
        crossfadeDuration: 2
    };

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Song metadata object.
     * Keeps the original per-song <audio> element for metadata/source storage only.
     * Actual playback happens through 2 shared decks.
     */
    function Song(player, url, $elem, targetSetId, mimeType) {
        const song = this;

        this.id = uid();
        this.$elem = $elem;
        this.targetSetId = targetSetId;
        this.$elem.attr("data-true-audio-player-song-id", this.id);
        this.$parentElem = null;

        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";
        this.audio.setAttribute("playsinline", "true");
        this.audio.setAttribute("webkit-playsinline", "true");
        
        // important for background playback
        this.audio.controls = false;
        this.audio.loop = false;

        const source = document.createElement("source");
        source.setAttribute("src", url);
        if (mimeType) {
            mimeType = mimeType.replace("\\", "/");
            source.setAttribute("type", mimeType);
        }
        this.audio.append(source);

        this.title = "";
        this.artist = "";
        this.album = "";
        this.genre = "";
        this.type = "";
        this.durationString = "0:00";
        this._thumbnail = "";
        this._thumbnailBlob = "";
        this._thumbnailBlobUrl = "";

        this.offset = 0;
        this.fadeOutTime = 0;
        this.fadeInTime = 0;
        this.startTime = 0;

        this.getThumbnail = function () {
            return this._thumbnail;
        };
        this.getThumbnailBlob = function () {
            return this._thumbnailBlob;
        };
        this.getThumbnailBlobUrl = function () {
            return this._thumbnailBlobUrl;
        };
        this.setThumbnail = function (t) {
            this._thumbnail = t;
        };
        this.getAudioContext = function () {
            return audioContext;
        };

        this.audio.addEventListener("loadedmetadata", function () {
            const mins = parseInt(song.audio.duration / 60, 10);
            let secs = parseInt(song.audio.duration % 60, 10);
            secs = secs >= 10 ? secs : "0" + secs;
            song.durationString = mins + ":" + secs;

            if (song.$parentElem) {
                song.$parentElem.find('[tmplayer-interaction="populate-duration"]').text(song.durationString);
            }

            if (player.getCurrentSong() === song) {
                player.$duration.text(song.durationString);
            }
        });
    }

    function Player(elem, options) {
        this.$elem = $(elem);
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this.init();
    }

    Player.prototype = {
        init: function () {
            const self = this;

            self.id = uid();
            self.name = self.$elem.attr("tmplayer-init");
            self.isDragging = false;
            self.songs = [];
            self.targetSets = {};
            self._volume = 1;
            self._playerState = "stopped";
            self._currentSongIndex = -1;
            self.tempCurrentTime = 0;
            self._fadeStarted = false;
            self._isCrossfading = false;
            self._decksPrimed = false;

            self.$songName = self.$elem.find('[tmplayer-element="title"]').attr("tmplayer-interaction", "monitor-state");
            self.$thumbnail = self.$elem.find('[tmplayer-element="thumbnail"]').attr("tmplayer-interaction", "monitor-state");
            self.$albumName = self.$elem.find('[tmplayer-element="album"]').attr("tmplayer-interaction", "monitor-state");
            self.$artistName = self.$elem.find('[tmplayer-element="artist"]').attr("tmplayer-interaction", "monitor-state");
            self.$genre = self.$elem.find('[tmplayer-element="genre"]').attr("tmplayer-interaction", "monitor-state");
            self.$type = self.$elem.find('[tmplayer-element="type"]').attr("tmplayer-interaction", "monitor-state");

            self.playButton = self.$elem.find('[tmplayer-button="play"]');
            self.pauseButton = self.$elem.find('[tmplayer-button="pause"]');
            self.nextButton = self.$elem.find('[tmplayer-button="next"]');
            self.previousButton = self.$elem.find('[tmplayer-button="previous"]');
            self.stopButton = self.$elem.find('[tmplayer-button="stop"]');

            self.volumeUpButton = self.$elem.find('[tmplayer-button="volume-up"]');
            self.volumeDownButton = self.$elem.find('[tmplayer-button="volume-down"]');
            self.volumeMuteButton = self.$elem.find('[tmplayer-button="volume-mute"]');
            self.volumeHalfButton = self.$elem.find('[tmplayer-button="volume-half"]');
            self.volumeFullButton = self.$elem.find('[tmplayer-button="volume-full"]');

            self.volumeToggleButtons = $($.map([self.volumeMuteButton, self.volumeHalfButton, self.volumeFullButton], function (btn) {
                return btn.get();
            }));

            self.$progressBarWrapper = self.$elem.find('[tmplayer-element="progress-bar-wrapper"]');
            self.$progressBar = self.$elem.find('[tmplayer-element="progress-bar"]');
            self.$duration = self.$elem.find('[tmplayer-element="duration"]');
            self.$elapsed = self.$elem.find('[tmplayer-element="elapsed"]').text("0:00");
            self.$volumeBarWrapper = self.$elem.find('[tmplayer-element="volume-bar-wrapper"]');
            self.$volumeBar = self.$elem.find('[tmplayer-element="volume-bar"]');
            self.$clickTargets = $("[tmplayer-click]");
            self.$ajaxContainers = $('[tmplayer-dynamic-content="' + self.name + '"]');
            self.targetSets.player = self.$elem.find('[tmplayer-interaction="monitor-state"]');

            self.pauseButton.hide();
            self.$progressBar.width("0%");
            self.$volumeBar.width("100%");

            document.addEventListener("visibilitychange", () => {
            
                if (document.hidden) {
                    if (audioContext.state === "suspended") {
                        audioContext.resume();
                    }
                }
            
            });

            // --- TWO DECK ENGINE ---
            self.createDeck = () => {
                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.preload = "auto";
                audio.setAttribute("playsinline", "true");
                audio.setAttribute("webkit-playsinline", "true");

                const mediaSource = audioContext.createMediaElementSource(audio);
                const gainNode = audioContext.createGain();

                mediaSource.connect(gainNode);
                gainNode.connect(audioContext.destination);
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);

                return {
                    id: uid(),
                    audio,
                    mediaSource,
                    gainNode,
                    song: null,
                    sourceUrl: "",
                    sourceType: ""
                };
            };

            self.deckA = self.createDeck();
            self.deckB = self.createDeck();
            self.activeDeck = self.deckA;
            self.nextDeck = self.deckB;

            self.bindDeckEvents(self.deckA);
            self.bindDeckEvents(self.deckB);

            self.initAllExternalSongs();
            self.initAllEmbeddedSongs();

            if (0 !== self.songs.length) {
                self.playButton.on("click", function () {
                    self.playCurrentSong();
                });

                self.stopButton.on("click", function () {
                    self.stopCurrentSong();
                });

                self.pauseButton.on("click", function () {
                    self.pauseCurrentSong();
                });

                self.volumeUpButton.on("click", function () {
                    self.setVolume(self.getVolume() + 0.1);
                });

                self.volumeDownButton.on("click", function () {
                    self.setVolume(self.getVolume() - 0.1);
                });

                self.volumeToggleButtons.on("click", function () {
                    self.getVolume() > 0 ? self.setVolume(0) : self.setVolume(1);
                });

                self.nextButton.on("click", function () {
                    self.playNextSong(true);
                });

                self.previousButton.on("click", function () {
                    self.playPreviousSong();
                });

                self.$clickTargets.on("click", function () {
                    const action = $(this).attr("tmplayer-click");
                    switch (action) {
                        case "play":
                            self.playCurrentSong();
                            break;
                        case "pause":
                            self.pauseCurrentSong();
                            break;
                        case "stop":
                            self.stopCurrentSong();
                            break;
                        default:
                            console.error(action + " does not exist on true music player.");
                    }
                });

                self.setVolume(1);
                self.initProgressBarEvents();
                self.initVolumeBarEvents();
                self.initAjaxLoadObserver();
                self.initMediaAPIActions();
            } else {
                console.error("There are no songs in the player.");
            }

            const savedIndex = localStorage.getItem("currentSongIndex");
            const currentSongIndex = savedIndex !== null ? Number(savedIndex) : 0;
            self.setCurrentSong(currentSongIndex);

            document.addEventListener("touchstart", () => {
                if (audioContext.state !== "running") {
                    audioContext.resume();
                }
            }, { once: true });
        },

        bindDeckEvents: function (deck) {
            const self = this;

            deck.audio.addEventListener("timeupdate", function () {
                if (deck !== self.activeDeck) return;
                if (self.isDragging || self.getPlayerState() === "paused") return;
                if (!deck.song) return;

                const currentTime = deck.audio.currentTime || 0;
                const duration = deck.audio.duration || 0;

                self.updateSongDisplayTime(currentTime, duration);

                const fadeBeforeEnd = deck.song.fadeOutTime || self.settings.crossfadeDuration || 2;

                if (duration && currentTime >= duration - fadeBeforeEnd) {
                    if (self._fadeStarted) return;
                    self._fadeStarted = true;
                    self.playNextSong(false);
                } else {
                    self.preloadSong(self.getNextSong());
                }
            });

            deck.audio.addEventListener("volumechange", function (e) {
                const n = 100 * e.srcElement.volume;
                self.$volumeBar.width(n + "%");
            });

            deck.audio.addEventListener("play", function () {
                const song = deck.song || self.getCurrentSong();
                if (song && self.targetSets[song.targetSetId]) {
                    self.targetSets[song.targetSetId].removeClass("is-buffering");
                }
                if (song) {
                    self.setPlayerState("playing", song);
                }
                if ("mediaSession" in navigator) {
                    navigator.mediaSession.playbackState = "playing";
                }
            });

            deck.audio.addEventListener("pause", function () {
                const song = deck.song || self.getCurrentSong();
                if (song) {
                    self.setPlayerState("paused", song);
                }
                if ("mediaSession" in navigator) {
                    navigator.mediaSession.playbackState = "paused";
                }
            });

            deck.audio.addEventListener("waiting", function () {
                const song = deck.song || self.getCurrentSong();
                if (song && self.targetSets[song.targetSetId]) {
                    self.targetSets[song.targetSetId].addClass("is-buffering");
                }
            });

            deck.audio.addEventListener("ended", function () {
                if (deck !== self.activeDeck) return;
                if (self._isCrossfading) return;

                if (self.songs.length <= 1 || self.isDragging || self.settings.autoplay === 0) {
                    self.stopCurrentSong();
                } else {
                    self.playNextSong(true);
                }
            });
        },

        loadSongIntoDeck: function (deck, song, offset = 0) {
            if (!song) return;

            deck.song = song;

            const sourceEl = song.audio.querySelector("source");
            const src = sourceEl ? sourceEl.src : song.audio.currentSrc || song.audio.src || "";
            const type = sourceEl ? (sourceEl.type || "") : (song.audio.type || "");

            if (deck.sourceUrl !== src || deck.sourceType !== type) {
                deck.audio.src = src;
                deck.sourceUrl = src;
                deck.sourceType = type;
                deck.audio.load();
            }

            try {
                deck.audio.currentTime = offset;
            } catch (err) {
                // Safari can throw if metadata isn't ready yet; ignore.
            }

            deck.audio.volume = this._volume;
            deck.audio.muted = false;
            deck.audio.playsInline = true;
            deck.audio.setAttribute("playsinline", "");
        },

        preloadPlayCurrentSong: function () {
            const song = this.getCurrentSong();
            if (!song) return;
            this.playSong(song, 0, song.offset ?? 0, true);
        },

        preloadSong: function (song) {
            if (!song) return;
            if (this.nextDeck.song === song) return;
            this.loadSongIntoDeck(this.nextDeck, song, 0);
        },

        getVolume: function () {
            return this._volume;
        },

        setVolume: function (value) {
            value < 0 ? value = 0 : value > 1 && (value = 1);

            this.volumeMuteButton.hide();
            this.volumeHalfButton.hide();
            this.volumeFullButton.hide();

            const shown = (0 === value
                ? this.volumeMuteButton.show()
                : value < 0.66
                    ? this.volumeHalfButton.show()
                    : this.volumeFullButton.show()
            ).length;

            if (0 === shown) this.volumeFullButton.show();

            this._volume = value;

            if (this.deckA) this.deckA.audio.volume = value;
            if (this.deckB) this.deckB.audio.volume = value;
        },

        unlockAudioContext: function () {
            const ctx = audioContext;
            if (ctx.state === "running") return;

            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            gain.gain.value = 0;
            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.01);

            ctx.resume();
        },

        primeDecksOnce: function () {
            if (this._decksPrimed) return Promise.resolve();

            const silent = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAA";
            const decks = [this.deckA, this.deckB];

            return Promise.all(decks.map((deck) => {
                return new Promise((resolve) => {
                    const originalSrc = deck.audio.src || "";
                    deck.audio.src = silent;
                    deck.audio.muted = true;

                    const p = deck.audio.play();
                    if (p && typeof p.then === "function") {
                        p.then(() => {
                            deck.audio.pause();
                            deck.audio.currentTime = 0;
                            deck.audio.src = originalSrc;
                            if (originalSrc) {
                                deck.audio.load();
                            } else {
                                deck.audio.removeAttribute("src");
                            }
                            deck.audio.muted = false;
                            resolve();
                        }).catch(() => {
                            deck.audio.muted = false;
                            resolve();
                        });
                    } else {
                        deck.audio.muted = false;
                        resolve();
                    }
                });
            })).then(() => {
                this._decksPrimed = true;
            });
        },

        playCurrentSong: function () {
            const self = this;

            self.unlockAudioContext();

            const continuePlay = function () {
                window.truePlayerManager.activePlayer && window.truePlayerManager.activePlayer !== self && window.truePlayerManager.activePlayer.pauseCurrentSong();

                self.pauseButton.show();
                self.playButton.hide();

                if (self.deckA) self.deckA.audio.volume = self.getVolume();
                if (self.deckB) self.deckB.audio.volume = self.getVolume();

                window.truePlayerManager.activePlayer = self;

                const current = self.getCurrentSong();
                const next = self.getNextSong() || current;
                self.settings.crossfadeDuration = self.fadeTime(current.type, next.type);

                self.preloadSong(next);
                self.preloadPlayCurrentSong();
                self.setPlayerState("playing", current);
            };

            if (!self._decksPrimed) {
                self.primeDecksOnce().then(continuePlay);
            } else {
                continuePlay();
            }
        },

        stopCurrentSong: function () {
            const song = this.getCurrentSong();

            this.pauseCurrentSong();
            this.stopSong(song, true);

            if (song) {
                song.offset = 0;
            }

            if (this.nextDeck) {
                this.nextDeck.audio.pause();
                this.nextDeck.gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            }

            if (song) {
                this.setPlayerState("paused", song);
            }
        },

        pauseCurrentSong: function () {
            const song = this.getCurrentSong();

            if (song && this.activeDeck) {
                song.offset = this.getPlaybackPosition(song);
            }

            this.pauseButton.hide();
            this.playButton.show();

            if (window.truePlayerManager.activePlayer === this) {
                window.truePlayerManager.activePlayer = null;
                window.truePlayerManager.previouslyActivePlayer = this;
            }

            this.stopSong(song, true);

            if (this.nextDeck) {
                this.nextDeck.audio.pause();
                const now = audioContext.currentTime;
                this.nextDeck.gainNode.gain.cancelScheduledValues(now);
                this.nextDeck.gainNode.gain.setValueAtTime(0, now);
            }

            if (song) {
                this.setPlayerState("paused", song);
            }
        },

        togglePauseCurrentSong: function () {
            "playing" === this.getPlayerState() ? this.pauseCurrentSong() : this.playCurrentSong();
        },

        toggleStopCurrentSong: function () {
            "playing" === this.getPlayerState() ? this.stopCurrentSong() : this.playCurrentSong();
        },

        getCurrentSong: function () {
            return this.getSongAt(this.getCurrentSongIndex());
        },

        getNextSong: function () {
            return this.getSongAt(this.getCurrentSongIndex() + 1);
        },

        getSongAt: function (index) {
            index = this.songs[index] ? index : 0;
            return this.songs[index];
        },

        setCurrentSong: function (index) {
            const song = this.songs[index];
            if (!song) {
                console.error("Song with index " + index + " not found.");
                return false;
            }

            const previous = this.songs[this._currentSongIndex];

            if (previous && previous.$parentElem && previous.targetSetId !== song.targetSetId) {
                previous.$parentElem.removeClass("is-current");
                this.targetSets[previous.targetSetId].removeClass("is-current");
            }

            this._currentSongIndex = index;

            if (song.$parentElem) {
                song.$parentElem.addClass("is-current");
                this.targetSets[song.targetSetId].addClass("is-current");
            }

            const thumb = song.getThumbnail();
            thumb ? this.$thumbnail.attr("src", thumb) : this.$thumbnail.removeAttr("src");

            this.$songName.text(song.title);
            this.$albumName.text(song.album);
            this.$artistName.text(song.artist);
            this.$duration.text(song.durationString);
            this.$genre.text(song.genre);

            localStorage.setItem("currentSongIndex", index);
        },

        initProgressBarEvents: function () {
            const self = this;

            self.$progressBarWrapper.on("touchstart", function (evt) {
                evt.preventDefault();

                if (!self.activeDeck || 0 === self.activeDeck.audio.readyState) return false;

                self.isDragging = true;
                const scrubbed = self.scrubSong(evt);
                const duration = self.activeDeck.audio.duration;

                self.updateSongDisplayTime(scrubbed, duration);

                $(window).on("touchmove.trueAudioPlayer", function (moveEvt) {
                    const moved = self.scrubSong(moveEvt);
                    self.updateSongDisplayTime(moved, duration);
                });

                $(window).one("touchend", function () {
                    $(window).off("touchmove.trueAudioPlayer");
                    if (self.activeDeck) {
                        self.activeDeck.audio.currentTime = self.tempCurrentTime;
                        const song = self.getCurrentSong();
                        if (song) song.offset = self.tempCurrentTime;
                    }
                    self.isDragging = false;
                });
            });

            self.$progressBarWrapper.on("mousedown", function (evt) {
                evt.preventDefault();

                if (!self.activeDeck || 0 === self.activeDeck.audio.readyState) return false;

                self.isDragging = true;
                const scrubbed = self.scrubSong(evt);
                const duration = self.activeDeck.audio.duration;

                self.updateSongDisplayTime(scrubbed, duration);

                $(window).on("mousemove.trueAudioPlayer", function (moveEvt) {
                    const moved = self.scrubSong(moveEvt);
                    self.updateSongDisplayTime(moved, duration);
                });

                $(window).one("mouseup", function () {
                    $(window).off("mousemove.trueAudioPlayer");
                    if (self.activeDeck) {
                        self.activeDeck.audio.currentTime = self.tempCurrentTime;
                        const song = self.getCurrentSong();
                        if (song) song.offset = self.tempCurrentTime;
                    }
                    self.isDragging = false;
                });
            });
        },

        initVolumeBarEvents: function () {
            const self = this;

            self.$volumeBarWrapper.on("mousedown", function (evt) {
                evt.preventDefault();
                self.scrubVolume(evt);

                $(window).on("mousemove.trueAudioPlayer", function (moveEvt) {
                    self.scrubVolume(moveEvt);
                });

                $(window).one("mouseup", function () {
                    $(window).off("mousemove.trueAudioPlayer");
                });
            });

            self.$volumeBarWrapper.on("touchstart", function (evt) {
                evt.preventDefault();
                self.scrubVolume(evt);

                $(window).on("touchmove.trueAudioPlayer", function (moveEvt) {
                    self.scrubVolume(moveEvt);
                });

                $(window).one("touchend", function () {
                    $(window).off("touchmove.trueAudioPlayer");
                });
            });
        },

        scrubSong: function (evt) {
            const clientX = ("touchstart" === evt.type || "touchmove" === evt.type) ? evt.touches[0].clientX : evt.clientX;
            const wrapperWidth = this.$progressBarWrapper.width();
            let ratio = (clientX - this.$progressBarWrapper.offset().left) / wrapperWidth;

            ratio < 0 ? ratio = 0 : ratio > 1 && (ratio = 1);

            const duration = this.activeDeck && this.activeDeck.audio ? this.activeDeck.audio.duration : 0;
            const time = duration * ratio;

            this.tempCurrentTime = time;
            return time;
        },

        scrubVolume: function (evt) {
            const clientX = ("touchstart" === evt.type || "touchmove" === evt.type) ? evt.touches[0].clientX : evt.clientX;
            const wrapperWidth = this.$volumeBarWrapper.width();
            const ratio = (clientX - this.$volumeBarWrapper.offset().left) / wrapperWidth;
            this.setVolume(ratio);
        },

        getSongLabel: function (song) {
            if (!song) return "unknown-track";

            const name = song.name || song.id || "unknown-track";
            const duration = song.audio?.duration || null;

            return duration ? `${name} (duration: ${duration.toFixed?.(2) ?? duration}s)` : name;
        },

        logFadeEvent: function (direction, details) {
            console.log(`[${direction.toUpperCase()}]`, {
                ts: performance.now(),
                ...details
            });
        },

        fadeIn: function (type, songRef, startTime, fadeDuration) {
            if (!songRef.gainNode) {
                this.logFadeEvent("fadeIn", {
                    warning: "Missing gainNode",
                    type,
                    song: this.getSongLabel(songRef.song || this.getCurrentSong()),
                    startTime,
                    fadeDuration
                });
                return;
            }

            const g = songRef.gainNode.gain;
            const beforeValue = g.value;

            let rampType = null;
            let targetValue = null;
            let endTime = null;

            g.cancelScheduledValues(startTime);
            g.setValueAtTime(0.001, startTime);

            switch (type) {
                case "liner":
                case "show":
                    rampType = "exponential";
                    targetValue = 1;
                    endTime = startTime;
                    g.setValueAtTime(1, startTime);
                    break;
                case "music":
                case "promo":
                default:
                    rampType = "linear";
                    targetValue = 1;
                    endTime = startTime + fadeDuration;
                    g.linearRampToValueAtTime(targetValue, endTime);
            }

            this.logFadeEvent("fadeIn", {
                type,
                song: this.getSongLabel(songRef.song || this.getCurrentSong()),
                startTime,
                fadeDuration,
                rampType,
                targetValue,
                endTime,
                beforeValue,
                afterSetValueAtTime: 0.001
            });
        },

        fadeOut: function (type, songRef, fadeDuration) {
            if (!songRef.gainNode) {
                this.logFadeEvent("fadeOut", {
                    warning: "Missing gainNode",
                    type,
                    song: this.getSongLabel(songRef.song || this.getCurrentSong()),
                    fadeDuration
                });
                return;
            }

            const startTime = Math.max(0, audioContext.currentTime);

            const g = songRef.gainNode.gain;
            const beforeValue = g.value;
            let rampType = null;
            let targetValue = null;
            let endTime = null;

            g.cancelScheduledValues(startTime);
            g.setValueAtTime(Math.max(g.value, 0.001), startTime);

            switch (type) {
                case "music":
                    rampType = "exponential";
                    targetValue = 0.001;
                    endTime = startTime + fadeDuration;
                    g.exponentialRampToValueAtTime(targetValue, endTime);
                    break;
                case "liner":
                case "show":
                    rampType = "none";
                    targetValue = 1;
                    endTime = startTime;
                    break;
                case "promo":
                default:
                    rampType = "linear";
                    targetValue = 0.001;
                    endTime = startTime + fadeDuration;
                    g.linearRampToValueAtTime(0, startTime + fadeDuration);
            }

            this.logFadeEvent("fadeOut", {
                type,
                song: this.getSongLabel(songRef.song || this.getCurrentSong()),
                startTime,
                fadeDuration,
                rampType,
                targetValue,
                endTime,
                beforeValue,
                afterSetValueAtTime: beforeValue
            });
        },

        fadeTime: function (outType, inType) {
            switch (outType) {
                case "promo":
                case "music":
                    return this.settings.crossfadeDuration;
                case "liner":
                case "show":
                    switch (inType) {
                        case "music":
                        case "promo":
                            return 1.5;
                        default:
                            return 0.5;
                    }
                default:
                    return this.settings.crossfadeDuration;
            }
        },

        getSongEndTime: function (song) {
            const startedAt = song.startTime || audioContext.currentTime;
            const offset = song.offset || this.tempCurrentTime;
            const duration = this.activeDeck && this.activeDeck.audio ? (this.activeDeck.audio.duration || 0) : 0;
            return startedAt + (duration - offset);
        },

        getPlaybackPosition: function () {
            if (!this.activeDeck || !this.activeDeck.audio) return 0;
            return this.activeDeck.audio.currentTime || 0;
        },

        playSong: function (song, fadeTime = 2, offset = 0, dispatch = false) {
            const ctx = audioContext;

            if (ctx.state !== "running") {
                ctx.resume();
            }

            const deck = this.activeDeck;
            this.loadSongIntoDeck(deck, song, offset);

            song.startTime = ctx.currentTime;
            song.offset = offset || 0;

            const playPromise = deck.audio.play();

            if (fadeTime > 0) {
                this.fadeIn(song.type, { gainNode: deck.gainNode, song }, song.startTime, fadeTime);
            } else {
                deck.gainNode.gain.setValueAtTime(1, song.startTime);
            }

            if (dispatch) {
                const playEvent = new Event("play", { bubbles: true, cancelable: true });
                deck.audio.dispatchEvent(playEvent);
            }

            if (playPromise && playPromise.catch) {
                playPromise.catch(err => console.warn("Playback failed:", err));
            }
        },

        stopSong: function (song, dispatch = false) {
            const deck = this.activeDeck;
            if (!deck) return;

            deck.audio.pause();

            const now = audioContext.currentTime;
            deck.gainNode.gain.cancelScheduledValues(now);
            deck.gainNode.gain.setValueAtTime(0, now);

            if (dispatch) {
                const pauseEvent = new Event("pause", { bubbles: true, cancelable: true });
                deck.audio.dispatchEvent(pauseEvent);
            }
        },

        playNextSong: function (skip = false) {
            if (this.songs.length <= 1) return false;

            const currentSong = this.getCurrentSong();
            const currentIndex = this.getCurrentSongIndex();
            const nextIndex = this.songs[currentIndex + 1] ? currentIndex + 1 : 0;
            const nextSong = this.getSongAt(nextIndex);

            const fadeTime = this.fadeTime(currentSong.type, nextSong.type);

            const outgoingDeck = this.activeDeck;
            const incomingDeck = this.nextDeck;

            this._isCrossfading = true;
            this.loadSongIntoDeck(incomingDeck, nextSong, 0);

            const ctx = audioContext;
            const startTime = ctx.currentTime;

            nextSong.startTime = startTime;
            nextSong.offset = 0;

            const playPromise = incomingDeck.audio.play();

            if (playPromise && playPromise.catch) {
                playPromise.catch(err => console.warn("Playback failed:", err));
            }

            this.fadeIn(nextSong.type, { gainNode: incomingDeck.gainNode, song: nextSong }, startTime, fadeTime);

            if (!skip) {
                this.fadeOut(currentSong.type, { gainNode: outgoingDeck.gainNode, song: currentSong }, fadeTime);
            } else {
                outgoingDeck.audio.pause();
            }

            setTimeout(() => {
                outgoingDeck.audio.pause();
                outgoingDeck.gainNode.gain.setValueAtTime(0, audioContext.currentTime);

                this.activeDeck = incomingDeck;
                this.nextDeck = outgoingDeck;

                this.setCurrentSong(nextIndex, false);
                this.setPlayerState("playing", nextSong);

                this.preloadSong(this.getNextSong());

                this._isCrossfading = false;
                this._fadeStarted = false;
            }, Math.max(fadeTime, 0.05) * 1000);
        },

        playPreviousSong: function () {
            if (this.songs.length <= 1) return false;

            let prevIndex = this.getCurrentSongIndex() - 1;
            if (prevIndex < 0) prevIndex = this.songs.length - 1;

            const prevSong = this.getSongAt(prevIndex);

            this.activeDeck.audio.pause();
            this.activeDeck.gainNode.gain.setValueAtTime(0, audioContext.currentTime);

            this.setCurrentSong(prevIndex, false);
            this.playSong(prevSong, 0, 0, true);
        },

        setPlayerState: function (state, song) {
            if (!song) return false;
            if (state === this._playerState) return false;

            this.$elem.removeClass("is-playing is-paused");
            const playerTargets = this.targetSets.player.removeClass("is-playing is-paused");
            const item = song.$parentElem;

            let targetSet;
            if (item) {
                item.removeClass("is-playing is-paused");
                targetSet = this.targetSets[song.targetSetId].removeClass("is-playing is-paused");
            }

            switch (state) {
                case "playing":
                    this.$elem.addClass("is-playing");
                    playerTargets.addClass("is-playing");
                    if (item) {
                        item.addClass("is-playing");
                        targetSet.addClass("is-playing");
                    }

                    if ("mediaSession" in navigator) {
                         navigator.mediaSession.metadata = new MediaMetadata({
                            title: song.title,
                            artist: song.artist,
                            album: song.album,
                            artwork: [
                                {
                                    src: song.getThumbnail?.() || "",
                                    sizes: "512x512",
                                    type: "image/png"
                                }
                            ]
                        });
                    }

                    this._playerState = "playing";
                    break;

                case "paused":
                    this.$elem.addClass("is-paused");
                    playerTargets.addClass("is-paused");
                    if (item) {
                        item.addClass("is-paused");
                        targetSet.addClass("is-paused");
                    }
                    this._playerState = "paused";
                    break;

                default:
                    this._playerState = "stopped";
            }
        },

        getPlayerState: function () {
            return this._playerState;
        },

        getCurrentSongIndex: function () {
            return this._currentSongIndex;
        },

        updateSongDisplayTime: function (currentTime, duration) {
            const progress = duration ? currentTime / duration * 100 : 0;
            const mins = parseInt(currentTime / 60, 10);
            let secs = parseInt(currentTime % 60, 10);
            secs = secs >= 10 ? secs : "0" + secs;

            this.$elapsed.text(mins + ":" + secs);
            this.$progressBar.width(progress + "%");
        },

        initAjaxLoadObserver: function () {
            const self = this;

            self.$ajaxContainers.each(function (_, container) {
                new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        mutation.addedNodes.forEach(function (node) {
                            if (node.getAttribute && node.getAttribute("tmplayer-parent") === self.name) {
                                self.initExternalSong(node);
                            }
                        });
                    });
                }).observe(container, {
                    subtree: false,
                    childList: true
                });
            });
        },

        initExternalSong: function (elem) {
            const self = this;
            const $container = $(elem);
            const targetSetId = uid();

            self.targetSets[targetSetId] = $container.find('[tmplayer-interaction="monitor-state"]');

            $container.find('[tmplayer-action="none"]').on("click", function (evt) {
                evt.stopPropagation();
            });

            const actions = [$container.find('[tmplayer-action="toggle"]')];
            if ("toggle" === $container.attr("tmplayer-action")) actions.push($container);

            const nodes = $.map(actions, function ($node) {
                return $node.get();
            });

            $(nodes).on("click", function () {
                const scopedSongs = self.songs.map(function (song, idx) {
                    return {
                        globalIndex: idx,
                        song: song
                    };
                }).filter(function (row) {
                    return row.song.targetSetId === targetSetId;
                });

                const currentId = self.getCurrentSong().id;
                const isCurrentInScope = scopedSongs.filter(function (row) {
                    return row.song.id === currentId;
                }).length > 0;

                if (isCurrentInScope) {
                    self.togglePauseCurrentSong();
                } else {
                    self.stopCurrentSong();
                    self.setCurrentSong(scopedSongs[0].globalIndex, true);
                    self.playCurrentSong();
                }
            });

            $(elem).find('[tmplayer-element="audio"]').hide().each(function (_, audioElem) {
                self.grabAndSetSongData(audioElem, elem, targetSetId);
            });
        },

        initAllEmbeddedSongs: function () {
            const self = this;
            self.$elem.find('[tmplayer-element="audio"]').hide().each(function (_, audioElem) {
                self.grabAndSetSongData(audioElem);
            });
        },

        initAllExternalSongs: function () {
            const self = this;
            $('[tmplayer-parent="' + self.name + '"]').each(function (_, node) {
                self.initExternalSong(node);
            });
        },

        grabAndSetSongData: function (audioMetaElem, parentElem, targetSetId) {
            const $audioMeta = $(audioMetaElem);
            const $parent = parentElem ? $(parentElem) : undefined;

            const audioUrl = $audioMeta.children('[tmplayer-meta="audio-url"]').text();
            const audioType = $audioMeta.children('[tmplayer-meta="audio-type"]').text();

            const song = new Song(this, audioUrl, $audioMeta, targetSetId, audioType);

            song.$parentElem = $parent;
            song.title = $audioMeta.children('[tmplayer-meta="title"]').text();
            song.artist = $audioMeta.children('[tmplayer-meta="artist"]').text();
            song.genre = $audioMeta.children('[tmplayer-meta="genre"]').text();
            song.album = $audioMeta.children('[tmplayer-meta="album"]').text();
            song.type = $audioMeta.children('[tmplayer-meta="type"]').text();

            if ($audioMeta.children('[tmplayer-meta="thumbnail"]').text()) {
                song.setThumbnail($audioMeta.children('[tmplayer-meta="thumbnail"]').text());
            } else if ($audioMeta.children('[tmplayer-meta="thumbnail"]').attr("src")) {
                song.setThumbnail($audioMeta.children('[tmplayer-meta="thumbnail"]').attr("src"));
            }

            this.songs.push(song);
        },

        initMediaAPIActions: function () {
            const self = this;
            const actions = [
                ["play", function () { self.playCurrentSong(); }],
                ["pause", function () { self.pauseCurrentSong(); }],
                ["previoustrack", function () { self.playPreviousSong(); }],
                ["nexttrack", function () { self.playNextSong(true); }],
                ["stop", function () { self.stopCurrentSong(); }],
                ["seekbackward", function (evt) {
                    const offset = evt.seekOffset || 10;
                    if (self.activeDeck) {
                        self.activeDeck.audio.currentTime = Math.max(self.activeDeck.audio.currentTime - offset, 0);
                    }
                }],
                ["seekforward", function (evt) {
                    const offset = evt.seekOffset || 10;
                    if (self.activeDeck) {
                        self.activeDeck.audio.currentTime = Math.min(
                            self.activeDeck.audio.currentTime + offset,
                            self.activeDeck.audio.duration || Infinity
                        );
                    }
                }],
                ["seekto", function (evt) {
                    if (self.activeDeck) {
                        self.activeDeck.audio.currentTime = evt.seekTime;
                    }
                }]
            ];

            for (const [action, handler] of actions) {
                try {
                    navigator.mediaSession.setActionHandler(action, handler);
                } catch (err) {
                    console.log("The media session action " + action + " is not supported yet.");
                }
            }
        },

        reinitSongs: function () {
            this.songs = [];
            this.initAllEmbeddedSongs();
            this.initAllExternalSongs();
        }
    };

    $.fn.extend({
        trueAudioPlayer: function (method) {
            const methods = {
                getName: function () {
                    return this.name;
                },
                pause: function () {
                    this.pauseCurrentSong();
                },
                stop: function () {
                    this.stopCurrentSong();
                },
                play: function (index) {
                    this.stopCurrentSong();
                    if (index !== undefined && index !== null) {
                        this.setCurrentSong(index, true);
                    }
                    this.playCurrentSong();
                },
                togglePause: function () {
                    this.togglePauseCurrentSong();
                },
                toggleStop: function () {
                    this.toggleStopCurrentSong();
                },
                reinitSongs: function () {
                    this.reinitSongs();
                }
            };

            if (methods[method]) {
                return methods[method].apply($(this).data("plugin_trueAudioPlayer"), Array.prototype.slice.call(arguments, 1));
            } else if ("object" !== typeof method && method) {
                console.error("Method " + method + " does not exist on True Audio Player");
                return this;
            }

            return this.each(function () {
                if (!$.data(this, "plugin_trueAudioPlayer")) {
                    $.data(this, "plugin_trueAudioPlayer", new Player(this, method));
                }
            });
        }
    });

    window.truePlayerEventManager = new function () {
        this.eventWatchers = [];

        this.addEventWatcher = function (eventName, callback) {
            this.eventWatchers.push({
                eventName,
                callback
            });
        };

        this.getEventWatchers = function (eventName) {
            return this.eventWatchers.filter(function (watcher) {
                return watcher.eventName === eventName;
            });
        };
    };

    window.truePlayerManager = new function () {
        function normalize(name) {
            return name.replace(/\s+/g, "-").toLowerCase();
        }

        this.activePlayer = null;
        this.allPlayers = {};
        this.previouslyActivePlayer = null;

        this.initializePlayers = function () {
            const self = this;

            $("[tmplayer-init]").each(function (_, node) {
                const $node = $(node);
                const options = {
                    autoplay: "false" !== $node.attr("tmplayer-autoplay")
                };

                $node.trueAudioPlayer(options);

                const name = $(node).trueAudioPlayer("getName");
                const normalized = normalize(name);

                if (normalized) {
                    if (self.allPlayers[normalized]) {
                        console.warn("An audio player with name " + name + " already exists. Fix the issue or you may experience problems.");
                    } else {
                        self.allPlayers[normalized] = $(node);
                    }
                }
            });
        };

        this.pauseActivePlayer = function () {
            this.activePlayer && this.activePlayer.pauseCurrentSong();
        };

        this.stopActivePlayer = function () {
            this.activePlayer && this.activePlayer.stopCurrentSong();
        };

        this.togglePauseActivePlayer = function (fallbackName) {
            let name;
            name = this.activePlayer ? this.activePlayer.name : this.previouslyActivePlayer ? this.previouslyActivePlayer.name : fallbackName;
            name ? this.togglePause(name) : console.warn("No player to toggle pause on");
        };

        this.toggleStopActivePlayer = function (fallbackName) {
            let name;
            name = this.activePlayer ? this.activePlayer.name : this.previouslyActivePlayer ? this.previouslyActivePlayer.name : fallbackName;
            name ? this.toggleStop(name) : console.warn("No player to toggle pause on");
        };

        this.pause = function (name) {
            const player = this.allPlayers[normalize(name)];
            player ? player.trueAudioPlayer("pause") : console.warn("Player named " + normalize(name) + " does not exist");
        };

        this.stop = function (name) {
            const player = this.allPlayers[normalize(name)];
            player ? player.trueAudioPlayer("stop") : console.warn("Player named " + normalize(name) + " does not exist");
        };

        this.togglePause = function (name) {
            const player = this.allPlayers[normalize(name)];
            player ? player.trueAudioPlayer("togglePause") : console.warn("Player named " + normalize(name) + " does not exist");
        };

        this.toggleStop = function (name) {
            const player = this.allPlayers[normalize(name)];
            player ? player.trueAudioPlayer("toggleStop") : console.warn("Player named " + normalize(name) + " does not exist");
        };

        this.play = function (name, index) {
            const player = this.allPlayers[normalize(name)];
            player ? player.trueAudioPlayer("play", index) : console.warn("Player named " + normalize(name) + " does not exist");
        };

        this.reinitSongs = function (name) {
            const player = this.allPlayers[normalize(name)];
            player ? player.trueAudioPlayer("reinitSongs") : console.warn("Player named " + normalize(name) + " does not exist");
        };
    };

    window.truePlayerManager.initializePlayers();

    console.log(
        `%cTrue Audio Player`,
        [
            "font-size: 1.25rem",
            "font-weight: bold",
            "line-height: 1.3",
            "font-family: Montserrat, Poppins, Helvetica, sans-serif",
            "color: rgb(33, 33, 33)",
            "background: rgb(206, 234, 104)",
            "padding: 0.75rem 1rem",
            "border-radius: 0.25rem"
        ].join(";"),
        "\n\nThis website uses the True Audio Player by Uplift Web Design. For documentation, visit https://www.upliftwebdesign.com/true-audio-player/getting-started"
    );

}($, window, document);
