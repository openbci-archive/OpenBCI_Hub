import { ipcRenderer } from 'electron';

document.addEventListener('DOMContentLoaded', () => {
  let n = new Notification('You did it!', {
    body: 'Nice work.'
  });

  // Tell the notification to show the menubar popup window on click
  n.onclick = () => { ipcRenderer.send('show-window') }

  // ipcRenderer.send('hey');

});

document.getElementById("quitButton").addEventListener("click", function(){
  ipcRenderer.send('quit');
});
