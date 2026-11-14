# French with Haresh

A French (or Spanish) vocabulary homework website.

**Teachers** register, create a class (with a class code), add students (each gets a PIN), set homework by pasting or uploading a vocab list, and watch progress.
**Students** open the website, type the class code and their PIN, and pick how to practise: match pairs, translate, listen and pick, tap what you hear, add spaces, or odd words out. They earn coins and climb a leaderboard.

---

## Put it online (free): GitHub + Neon + Render

You need three free accounts. It takes about 20 minutes the first time.

### 1. Put the code on GitHub
1. Go to https://github.com/new and create a repository called `mon-devoir` (Private is fine).
2. Click **uploading an existing file**, then drag in everything from this folder (the `public` folder, `server.js`, `db.js`, `package.json`, `README.md`, `render.yaml`, `.gitignore`). Commit.

### 2. Create the database (Neon)
1. Sign up at https://neon.tech and create a project (any name, any region near you).
2. On the dashboard click **Connect** and copy the **connection string**. It starts with `postgresql://`.
Neon's free database keeps your data permanently. (Do not skip this: the free web hosts wipe their own disk on every restart.)

### 3. Publish the website (Render)
1. Sign up at https://render.com (you can sign in with GitHub).
2. **New +** then **Web Service**, then pick your `mon-devoir` repository.
3. Settings: Runtime **Node**, Build Command `npm install`, Start Command `npm start`, Instance type **Free**.
4. Under **Environment Variables** add:
   - `DATABASE_URL` = the Neon connection string from step 2
   - `TZ_OFFSET_MIN` = `330` (India time; used for "logged on each day". Change it for other time zones, in minutes from UTC)
5. Click **Create Web Service**. After a few minutes you get a link like `https://mon-devoir.onrender.com`. That is the link you share with students.

Notes
- Free Render sites go to sleep when nobody uses them. The first visit after a quiet spell can take about a minute. The paid plan (about $7 a month) keeps it awake.
- Render serves the site over HTTPS automatically.

---

## How a teacher uses it

1. Open your link, choose **I'm a teacher**, then **Create an account**.
2. **Create class**: name, language, tiers, class code.
3. **Students** tab, **Add students**: paste a name column from Excel or type names. You get a PIN for each child. Use **Copy table** or **Paper cards** (prints a card per child).
4. **Homework** tab, **New homework**: this is where you upload or paste the vocab.
5. Tell students: open the link, tap **I'm a student**, enter the class code and their PIN.
6. Open a homework to see **Timings** (who logged on each day, Not started / In progress / Complete), **Results** (best score per activity) and the **Leaderboard**.

### Uploading homework
Each line is one item: French first, then English, separated by a comma, tab, semicolon, `=` or `|`.

```
le voisin = neighbour
la tante, aunt
Ma tante habitait loin = My aunt lived far away
```

- A line of **4 or more words**, or ending in `. ! ?`, is a **sentence**. Everything else is a **word**.
- Click **Upload a file** to add a `.csv`, `.txt` or Excel `.xlsx` file (the first two columns are used), or **Download template** for an example.

**Verbs (optional)**: one per line, with the 6 forms for je, tu, il/elle, nous, vous, ils/elles:
```
parler | to speak | present | parle, parles, parle, parlons, parlez, parlent
```

**Grammar gaps (optional)**: sentence with `___`, then the answer, then optional wrong options and a hint:
```
Elle ___ au marché. | va | vais, vas, vont | aller (present)
Je ___ français. | parle
```
With wrong options children choose; without them they type.

### The 19 exercises (you tick which ones each homework uses)
- **Vocabulary**: Match pairs, English to French, French to English, Flashcards, Type the French, Le/la/l', True or false
- **Listening and typing**: Listen and pick, **Dictation** (hear it, type it), Tap what you hear
- **Sentences**: Add spaces, Odd words out, Build the sentence, Missing word
- **Verbs**: Pick the verb form, Conjugate it (type), Match pronoun and verb
- **Grammar**: Fill the gap (choose), Fill the gap (type)

Exercises the content can't support are greyed out (for example verb exercises need a verb). **Recommended** ticks a sensible set. Typed answers ignore capitals and punctuation; a missing accent gives "Almost! Check the accents", and an accent bar is shown. Wrong answers come back once more. You can edit a homework later; existing results are kept.

## Run it on your own computer (optional)
```
npm install
npm start
```
Then open http://localhost:3000. Without `DATABASE_URL` it stores data in a local file under `data/`.

## Good to know
- **Audio**: by default the student's own device voice is used. The app picks the best French voice it finds, has a slow button, and the speaker icon on the path lets a child choose a voice. Chrome and Edge usually have good French voices; if a device has none, it says so. Teachers can check with **Help, Test voice**.
- **Natural voices (optional, recommended for dictation)**: create a Google Cloud Text-to-Speech API key and add it in Render as `GOOGLE_TTS_API_KEY`. Every phrase is generated once and stored in your database, so cost stays tiny (Google has a free monthly allowance). Optional: `TTS_VOICE_FR` (default `fr-FR-Neural2-A`) and `TTS_VOICE_ES`. If it fails, devices fall back to their own voice.
- Use first names or initials for students. The site stores no emails or phone numbers for children.
- Student PINs are 4 digits and only work together with your class code. Sign-in attempts are rate-limited.
