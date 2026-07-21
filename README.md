# TV Signage Web App

App web para TV com rotação automática de vídeos/flyers, painel de gestão, upload e agendamento por horários.

## Estrutura

- `index.html` (modo TV)
- `admin.html` (painel de administração)
- `styles.css`
- `app.js` (player TV)
- `admin.js` (gestão da playlist)
- `server.py` (servidor local + API)
- `config/playlist.json`
- `assets/media/` (vídeos)
- `assets/flyers/` (imagens)

## Arranque

```powershell
cd C:\Projetos\TV
python server.py --port 8080
```

Abre:
- `http://localhost:8080/` para reprodução na TV
- `http://localhost:8080/admin.html` para gerir conteúdos

## Fluxo recomendado

1. No painel admin, define a orientação do ecrã (Horizontal/Vertical) e, se quiseres, ativa o relógio no ecrã (hora e data, canto superior direito).
2. Adiciona itens por `src` manual ou por upload de ficheiro.
3. Define (opcionalmente) duração de imagens e horário/dias ativos.
4. Ordena os itens com `↑` e `↓`.
5. Clica em `Guardar playlist`.
6. No ecrã TV, carrega `R` para recarregar playlist (ou atualiza a página).

## Modo vertical (portrait)

- Preferencialmente, configurar no `admin.html` em "Configuração do ecrã".
- Também podes forçar por URL:
  - `http://localhost:8080/?orientation=portrait`
  - `http://localhost:8080/?orientation=landscape`
- Alternar horizontal/vertical no modo TV:
  - tecla `O`

## Agendamento

Cada item pode ter agendamento opcional:

```json
{
  "type": "image",
  "src": "./assets/flyers/flyer1.jpg",
  "duration": 10,
  "schedule": {
    "start": "09:00",
    "end": "18:30",
    "days": [1, 2, 3, 4, 5]
  }
}
```

- `days`: 0=Domingo ... 6=Sábado
- sem `schedule`: item ativo sempre
- horário que passa meia-noite é suportado (ex.: `22:00` até `02:00`)

## Atalhos (modo TV)

- `F`: fullscreen
- `N`: próximo item
- `Espaço`: pausa/retoma
- `R`: recarrega playlist
- `A`: abre painel admin
- `O`: alterna horizontal/vertical
