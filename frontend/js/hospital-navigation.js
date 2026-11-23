(() => {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (file === 'index.html' || file === '') return;
  if (file === 'tv.html') {
    const exit = document.createElement('a');
    exit.className = 'hospital-back tv-exit';
    exit.href = '#';
    exit.textContent = '← Voltar ao sistema';
    exit.addEventListener('click', event => { event.preventDefault(); if (window.opener) window.close(); else location.href = 'index.html'; });
    document.body.append(exit);
    return;
  }
  const backTargets = {'atendimento.html':'index.html','triagem.html':'index.html','medico.html':'index.html','medicacoes.html':'medico.html','alta.html':'medico.html'};
  const labels = {'atendimento.html':'Recepção e cadastro','triagem.html':'Triagem hospitalar','medico.html':'Painel médico','medicacoes.html':'Medicações prescritas','alta.html':'Alta médica'};
  const bar = document.createElement('header');
  bar.className = 'hospital-topbar';
  bar.innerHTML = `<div class="hospital-brand"><span class="hospital-mark">✚</span><span>Hospital Sentinela<small>${labels[file] || 'Sistema hospitalar'}</small></span></div><a class="hospital-back" href="${backTargets[file] || 'index.html'}" aria-label="Voltar ao painel anterior">← <span>Voltar</span></a>`;
  document.body.prepend(bar);
})();
