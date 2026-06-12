# Working at Height Learning Track Platform v0.5

Windows-first Electron desktop application for the NR-35 Working at Height Learning Track.

## Major features

- Five gated tabs: Start, SmartChats Analysis, Expert Interviewer, Final Quiz, Debriefing.
- Ebook download button on Tab 1.
- SmartChats CSV import and learner-level classification by email.
- Adaptive Expert Interviewer using the Cloudflare proxy endpoint.
- Adaptive Final Quiz using the same difficulty progression strategy as the Expert Interviewer.
- Mandatory Module 5 Expert-level quiz question before VR unlock.
- DOCX reports for Expert Interviewer, Final Quiz, and Debriefing.

## API access

The app calls the working Cloudflare endpoint through the Electron main process. The UF API key is not stored in the app.

Configured endpoint:

```text
https://tech-frontiers-senai-cimatec-openai-proxy.alexandre-g-siqueira.workers.dev/
```

The endpoint is used by `src/main.js` through the `call-cimatec` IPC handler.

## Running the app

From the project root:

```powershell
npm install
npm start
```

## Building the Windows installer

```powershell
npm run dist:win
```

The installer will be created in the `dist` folder.

## Adaptive Final Quiz rules

Starting difficulty is based on the Expert Interviewer result:

- Basic interview result starts quiz at Basic.
- Intermediate interview result starts quiz at Intermediate.
- Expert interview result starts quiz at Expert.

Progression:

- Correct Basic answer: same module, Intermediate.
- Correct Intermediate answer: same module, Expert.
- Correct Expert answer: next module, Expert.
- Incorrect answer: next module, Basic.

Special Module 5 rule:

- Every learner must receive at least one Expert-level question in Module 5.
- If Module 5 is reached at Basic or Intermediate, the quiz remains in Module 5 until an Expert-level question is presented.

## Data files

- `data/question-bank.json`: Expert Interviewer free-text question bank.
- `data/final-quiz-bank.json`: Multiple-choice Final Quiz question bank.
- `data/config.json`: General configuration.
- `docs/NR35_Revised_Professional_Ebook_Combined.docx`: Downloadable ebook.
