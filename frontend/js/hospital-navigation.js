(() => {
  'use strict';
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (file === 'index.html' || file === '') return;
  if (file === 'tv.html') {
    const exit = document.createElement('a');
    exit.className = 'hospital-back tv-exit';
    exit.href = 'index.html';
    exit.textContent = '← Voltar ao sistema';
    exit.setAttribute('aria-label', 'Voltar ao sistema');
    exit.addEventListener('click', event => {
      if (window.opener) { event.preventDefault(); window.close(); }
    });
    document.body.append(exit);
    return;
  }
  const backTargets = {
    'atendimento.html':'index.html', 'triagem.html':'index.html',
    'medico.html':'index.html', 'medicacoes.html':'medico.html', 'alta.html':'medico.html'
  };
  const labels = {
    'atendimento.html':'Recepção e cadastro', 'triagem.html':'Triagem de enfermagem',
    'medico.html':'Painel médico', 'medicacoes.html':'Medicações prescritas', 'alta.html':'Alta médica'
  };
  const bar = document.createElement('header');
  bar.className = 'hospital-topbar';
  const brand = document.createElement('div'); brand.className = 'hospital-brand';
  const mark = document.createElement('span'); mark.className = 'hospital-mark'; mark.textContent = '✚';
  const name = document.createElement('span'); name.append('Hospital Sentinela');
  const small = document.createElement('small'); small.textContent = labels[file] || 'Sistema hospitalar';
  name.append(small); brand.append(mark, name);
  const back = document.createElement('a'); back.className = 'hospital-back';
  back.href = backTargets[file] || 'index.html'; back.setAttribute('aria-label','Voltar ao painel anterior');
  back.textContent = '← Voltar';
  bar.append(brand, back); document.body.prepend(bar);
})();
