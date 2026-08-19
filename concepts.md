# Phase 3 — Integrated Terminal
Goal: a real, interactive shell running inside the bottom panel — not just a box that shows text, but one where you can run python3 main.py, see colored output, even drop into something like python3 REPL and type into it.
- Why this needs new concepts, not just a new component:
So far your IPC calls have been request → response (open file, get contents, done). A terminal is fundamentally different — it's a continuous stream in both directions: you type a keystroke, it goes to the shell; the shell produces output whenever it wants, not in response to a specific request. This is why we can't reuse your existing ipcRenderer.invoke() pattern alone — we need event-based IPC (send/on) for the streaming parts.
- The second new concept: a real terminal isn't just "run a command and capture stdout." Try running python3 (no args) with plain child_process.spawn and you'll find it doesn't behave like a terminal — no colors, broken prompts, some programs refuse to run at all. That's because interactive programs check "am I attached to a real TTY?" and behave differently if not. So we use node-pty, which creates a real pseudo-terminal (PTY) — the same mechanism your Mac's Terminal.app uses under the hood.
(Side note for later: when your agent runs pytest for verification in Phase 9, it'll use plain child_process.spawn/exec — one-shot, capture-output-and-exit. That's a different, simpler tool than this interactive terminal. Keep that distinction in your head; we'll build it separately.)

<!-- ! explanation : -->
- The key idea is:
    Your existing Electron features are like making a phone call:
    “Do this → wait → get one answer.”
    A terminal is like opening a live phone connection:
    both sides can send data continuously, at any time.

<!--^ 1. What you have been doing with IPC so far: -->
Suppose your frontend wants to read a file
Your architecture probably looks roughly like this:
    React Renderer
        |
        | ipcRenderer.invoke("read-file", path)
        v
    Preload
        |
        v
    Electron Main Process
        |
        | fs.readFile(...)
        v
    File System
    Then the result travels back:
    File System
        |
        v
    Main Process
        |
        | return fileContents
        v
    Preload
        |
        v
    React Renderer

- For example:
// Renderer
const content = await window.electronAPI.readFile(path);
The renderer says:
    "Read this file for me."
Then it waits:
    Request
    ↓
    Processing
    ↓
    Response
* This is called a request-response pattern.

<!--^ 2. Why a terminal is fundamentally different -->
    Now imagine a user opens your integrated terminal.
    They type:
    python3 main.py
    What happens?
        User
        |
        | "python3 main.py"
        v
        Shell
        |
        +----> Output: Starting application...
        |
        +----> Output: Loading model...
        |
        +----> Output: Processing data...
        |
        +----> Output: Done!

- Notice something important:
The terminal doesn't necessarily produce one final response.
It produces a stream:
    chunk 1 → Starting application...
    chunk 2 → Loading model...
    chunk 3 → Processing data...
    chunk 4 → Done!
And meanwhile, the user might type more input.
So we have communication in both directions:
User Input                     Terminal Output
React  ───────────────► Shell
       ◄───────────────
       ◄───────────────
       ◄───────────────
This is a continuous bidirectional stream.

<!--^ 3. Why ipcRenderer.invoke() alone is not enough -->
Let's say you tried this:
    const result = await window.electronAPI.runCommand(
    "python3 main.py"
    );
    console.log(result);

The flow would be:
    invoke("python3 main.py")
            |
            v
    Main Process starts command
            |
            v
    ???????? wait
            |
            v
    Command finishes
            |
            v
    Return all output

This could work for a simple command: ls
because: ls -> starts, prints something, and exits.
For example:
    Request: ls
    Response:
    file1.txt
    file2.txt
    main.py
Fine.
But what about:
    python3
with no arguments?
The process does this:
Python 3.12.0
>>>
Now Python is waiting for you.
You type: 2 + 2
Python immediately responds:
4
>>>
Then you type:
    name = "Rudra"
    It responds:
>>>
    Then:
    print(name)
    Output:
    Rudra
>>>
This process might continue forever.
So this makes no sense: const result = await invoke("start-python");
Because when should result arrive?
    const result = await ...  is waiting for: "The operation is complete."
But an interactive terminal is saying:
"I am not complete. I am still alive. Keep talking to me."
That is the fundamental difference.

<!--^ 4. Request-response vs streaming -->
    Normal IPC
    Renderer                         Main
    Request ───────────────────────►
                    Processing...
    ◄─────────────────────── Response
One request.
One response.
Done.
- Terminal IPC:
        Renderer                         Main                     Shell
        Input ───────────────►             ───────────────────────►
                                        ◄─────────────────────── Output
                    ◄──────────────────── Output

        Input ───────────────►             ───────────────────────►
                                        ◄─────────────────────── Output
                    ◄──────────────────── Output

                                        ◄─────────────────────── Output
                    ◄──────────────────── Output

The shell can generate output without the renderer asking for it.
That is why we need event-based IPC.

<!--^ 5. What are send and on? -->
Electron IPC gives us another communication style.
Instead of: 
    const result = await ipcRenderer.invoke(...)
we can do something like:
Send something
    ipcRenderer.send("terminal-input", "ls\n");
Meaning:
Send this data to the main process.
Then the main process listens:
ipcMain.on("terminal-input", (event, data) => {
    console.log(data);
});
So:
    Renderer
        |
        | send("terminal-input", "ls\n")
        v
        Main Process
        |
        | on("terminal-input")
        v
    Receive input
Output goes in the other direction
Suppose the shell produces:
file1.txt
file2.txt
The main process can send an event:
    mainWindow.webContents.send(
        "terminal-output",
        "file1.txt\r\nfile2.txt\r\n"
    );
Then the renderer listens:
    ipcRenderer.on("terminal-output", (event, data) => {
        console.log(data);
    });
So now:
    USER TYPES
      React
        |
        | send("terminal-input", "ls\n")
        v
        Main Process
        |
        v
        Shell
        SHELL PRODUCES OUTPUT
        Shell
        |
        v
        Main Process
        |
        | send("terminal-output", data)
        v
      React
This can happen repeatedly:
input
output
output
input
output
...
There is no requirement that every input has exactly one output.
That is the important concept.

<!--^ 9. The biggest example: interactive programs -->
Consider:
python3
Inside a real terminal:
Python 3.12.0
>>> 2 + 2
4
>>> print("hello")
hello
>>>
Python understands:
"I am running interactively."
Now imagine a more advanced program:
vim
or:
htop
These don't just print text.
They do things like:
Move cursor
Clear screen
Draw UI
Read individual key presses
Detect terminal size
Use arrow keys
Use escape sequences
For example, pressing:
↑
isn't necessarily "a normal line of text".
Interactive programs expect terminal behavior.
A simple pipe is not a full terminal environment.

<!--^ 10. What is a PTY? -->
PTY means:
Pseudo-Terminal
Think of it as a software-created terminal.

Your architecture becomes:
                 Real Terminal App
                       |
                       v
                     Shell

But in our Electron application:

                 Electron App
                       |
                       v
                  node-pty PTY
                       |
                       v
                     Shell
node-pty creates a pseudo-terminal that makes the shell think:
"I'm attached to a real terminal.
So:
┌─────────────────────────────────────┐
│           React Terminal UI          │
│                                     │
│  $ python3                          │
│  Python 3.12                        │
│  >>> 2 + 2                          │
│  4                                  │
│  >>> _                              │
└───────────────┬─────────────────────┘
                │
                │ IPC
                ▼
┌─────────────────────────────────────┐
│       Electron Main Process         │
│                                     │
│             node-pty                │
│                                     │
│         creates a PTY               │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│                 zsh                 │
│                                     │
│     python3 / git / npm / etc.      │
└─────────────────────────────────────┘

<!--^ 11. What node-pty gives us -->

Conceptually:
import * as pty from "node-pty";
    const shell = pty.spawn("zsh", [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });

Now we have a live shell process.
We can send input:
    shell.write("ls\r");
The shell executes:
    ls
And produces output.
We listen continuously:
    shell.onData((data) => {
        console.log(data);
    });

This might run many times:
    onData call #1:
    "$ "
    onData call #2:
    "file1.txt  "
    onData call #3:
    "file2.txt\r\n"
    onData call #4:
    "$ "

This is important:
Terminal output does not arrive as nice, complete messages.
You cannot assume:
onData(data)
means:
"Here is one complete command's output."
It might be only:
    "Hel"
Then:
    "lo"
Then:
    "\r\n"
Together:
Hello
So terminal output is a stream of chunks.
12. What happens when you type one key?
Suppose your integrated terminal is open:
$ _
You press:
p
The flow could be:
    Keyboard
        |
        v
        React
        |
        | "p"
        v
        Preload
        |
        v
        Electron Main
        |
        | shell.write("p")
        v
        PTY
        |
        v
       zsh
Then the shell echoes:
p
back:
    zsh
    |
    v
    PTY
    |
    v
    node-pty onData("p")
    |
    v
    Electron Main
    |
    v
    IPC event
    |
    v
    React
    |
    v
Terminal UI displays "p"

Then you press:
    y
Again:
React → Main → PTY → Shell
Shell → PTY → Main → React
Then:
    t
Then:
    h
Eventually:
$ python3_
Press Enter.
The renderer sends something like:
    \r
to the PTY.
Then:
    shell.write("\r")
The shell executes the command.

<!--^ 13. Why \r instead of just \n? -->
Terminal programs historically distinguish carriage return and line feed.
In PTY communication, pressing Enter is commonly represented as
    "\r"
So:
    ptyProcess.write("python3\r");
conceptually means:
Type: python3
Press: Enter
Then Python starts.

<!--^ 14. The full architecture we will build -->
Your Electron application will have something like this:
┌──────────────────────────────────────────────┐
│                  RENDERER                    │
│                 React App                    │
│  ┌────────────────────────────────────────┐  │
│  │             Terminal UI                │  │
│  │                                        │  │
│  │  $ python3                             │  │
│  │  Python 3.12                           │  │
│  │  >>> 2 + 2                             │  │
│  │  4                                     │  │
│  │  >>> _                                 │  │
│  └────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────┘
                       │
                       │ window.electronAPI
                       ▼
┌──────────────────────────────────────────────┐
│                   PRELOAD                    │
│  writeTerminal(data)                        │
│  onTerminalData(callback)                   │
└──────────────────────┬───────────────────────┘
                       │
                       │ contextBridge + IPC
                       ▼
┌──────────────────────────────────────────────┐
│               ELECTRON MAIN                  │
│  ipcMain.on("terminal-input")                │
│       ↓                                      │
│  ptyProcess.write(data)                      │
│                                              │
│  ptyProcess.onData((data) => {               │
│       mainWindow.webContents.send(...)       │
│  })                                          │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  NODE-PTY                    │
│                                              │
│              Pseudo Terminal                 │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                    ZSH                       │
│   $ python3                                  │
│   >>> 2 + 2                                  │
│   4                                          │
│   >>>                                        │
└──────────────────────────────────────────────┘