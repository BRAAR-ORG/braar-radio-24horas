async function fetchTracks() {
  const response = await fetch('https://api.github.com/repos/BRAAR-ORG/braarradio/releases/tags/musica');
  const data = await response.json();
  if (!data.assets) return { songs: [], locs: [], vinhetas: [] };

  const songs = [], locs = [], vinhetas = [];
  for (const a of data.assets) {
    if (a.name.endsWith('.mp3')) {
      if (a.name.startsWith('LOC_Sarah')) locs.push(a.browser_download_url);
      else if (a.name.startsWith('VIN_BRAAR')) vinhetas.push(a.browser_download_url);
      else songs.push(a.browser_download_url);
    }
  }
  return { songs, locs, vinhetas };
}

function formatTrackName(file) {
  return file.replace('.mp3','').replace(/[-_.]+/g,' ')
             .replace(/\b\w/g,c=>c.toUpperCase());
}

function fadeAudio(audio, targetVolume, duration=2000) {
  const step = (targetVolume - audio.volume) / (duration / 100);
  const interval = setInterval(() => {
    audio.volume = Math.min(Math.max(audio.volume + step, 0), 1);
    if ((step > 0 && audio.volume >= targetVolume) || (step < 0 && audio.volume <= targetVolume))
      clearInterval(interval);
  }, 100);
}

/* ==========================
   PLAYER PRINCIPAL COM PERSISTÊNCIA
   ========================== */
async function initPlayer() {
  const player = document.getElementById('audioPlayer');
  const voice = document.getElementById('voicePlayer');
  const vinheta = document.getElementById('vinhetaPlayer');
  const trackName = document.getElementById('trackName');
  const banner = document.getElementById('liveBanner');

  const { songs, locs, vinhetas } = await fetchTracks();
  if (!songs.length) {
    trackName.textContent = 'Nenhuma música encontrada.';
    return;
  }

  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  shuffle(songs); shuffle(locs); shuffle(vinhetas);

  let index = 0, count = 0, nextLoc = Math.floor(Math.random() * 9) + 2;

  // --- Recuperar estado salvo ---
  const saved = JSON.parse(localStorage.getItem('braar_player_state')) || {};
  if (saved.song && songs.includes(saved.song)) {
    index = songs.indexOf(saved.song);
  }

  async function playNext(resume=false) {
    let isLoc = false;
    if (locs.length && count >= nextLoc) {
      isLoc = true; count = 0; nextLoc = Math.floor(Math.random() * 9) + 2;
    }

    if (isLoc) {
      fadeAudio(player, 0.2, 2000);
      const locUrl = locs[Math.floor(Math.random()*locs.length)];
      trackName.textContent = 'AO VIVO com Sarah';
      banner.classList.add('show');
      voice.src = locUrl;
      voice.volume = 1;
      voice.play();
      voice.onended = () => { banner.classList.remove('show'); playVinheta(); };
    } else {
      const songUrl = songs[index];
      index = (index + 1) % songs.length;
      count++;

      trackName.textContent = formatTrackName(songUrl.split('/').pop());
      player.src = songUrl;
      player.volume = 1;

      if (resume && saved.position) {
        player.currentTime = saved.position;
      }

      player.play().catch(() => 
        document.body.addEventListener('click', () => player.play(), { once:true })
      );

      player.onended = playNext;

      // --- Salvar progresso a cada 5s ---
      setInterval(() => {
        localStorage.setItem('braar_player_state', JSON.stringify({
          song: songUrl,
          position: player.currentTime
        }));
      }, 5000);
    }
  }

  function playVinheta() {
    if (!vinhetas.length) return playNext();
    const vinUrl = vinhetas[Math.floor(Math.random()*vinhetas.length)];
    vinheta.src = vinUrl;
    vinheta.volume = 1;
    vinheta.play();
    vinheta.onended = () => { fadeAudio(player, 1, 2000); playNext(); };
  }

  playNext(true);
}

/* ==========================
   SISTEMA DE OUVINTES MELHORADO
   ========================== */
function simulateListeners() {
  const el = document.getElementById('listenersCount');
  let listeners = Number(localStorage.getItem('braar_listeners')) || Math.floor(Math.random()*40)+20;
  el.textContent = `👥 ${listeners} ouvintes online`;

  setInterval(() => {
    const change = Math.floor(Math.random()*5) - 2;
    listeners = Math.max(1, listeners + change);
    el.textContent = `👥 ${listeners} ouvintes online`;
    el.classList.add('updated');
    setTimeout(()=>el.classList.remove('updated'),500);
    localStorage.setItem('braar_listeners', listeners);
  }, 8000);
}

initPlayer();
simulateListeners();
