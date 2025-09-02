import React, { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { keymap, EditorView } from "@codemirror/view";
import io from "socket.io-client";
import { Decoration, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import Spinner from "./Spinner";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  VscFiles,
  VscChevronLeft,
  VscChevronRight,
  VscClose,
  VscCommentDiscussion,
  VscSymbolKeyword,
  VscNewFile,
  VscTrash,
  VscEdit,
  VscCopy
} from "react-icons/vsc";
import { FaUserCircle, FaRobot } from 'react-icons/fa';
import axios from "axios";

const socket = io("http://localhost:3001");

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "Go", value: "go" },
  { label: "C", value: "c" },
  { label: "C#", value: "csharp" },
  { label: "Ruby", value: "ruby" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "Rust", value: "rust" },
  { label: "TypeScript", value: "typescript" },
  { label: "PHP", value: "php" },
  { label: "Perl", value: "perl" },
  { label: "Scala", value: "scala" },
  { label: "R", value: "r" },
  { label: "Dart", value: "dart" },
  { label: "Pascal", value: "pascal" },
  { label: "Fortran", value: "fortran" },
  { label: "Lua", value: "lua" },
  { label: "Bash", value: "bash" },
  { label: "SQL", value: "sql" },
  { label: "Objective-C", value: "objectivec" },
  { label: "Groovy", value: "groovy" },
  { label: "OCaml", value: "ocaml" },
  { label: "VB.NET", value: "vbnet" },
  { label: "Haskell", value: "haskell" },
  { label: "Clojure", value: "clojure" },
  { label: "Erlang", value: "erlang" },
  { label: "Elixir", value: "elixir" },
  { label: "COBOL", value: "cobol" },
  { label: "Julia", value: "julia" },
  { label: "Crystal", value: "crystal" },
  { label: "Nim", value: "nim" },
  { label: "Lisp", value: "lisp" },
  { label: "Prolog", value: "prolog" },
  { label: "Scheme", value: "scheme" }
];

const EXTENSIONS = {
  javascript: [javascript(), oneDark, autocompletion({ activateOnTyping: true }), keymap.of(completionKeymap)],
  python: [python(), oneDark, autocompletion({ activateOnTyping: true }), keymap.of(completionKeymap)],
  c: [cpp(), oneDark, autocompletion({ activateOnTyping: true }), keymap.of(completionKeymap)],
  cpp: [cpp(), oneDark, autocompletion({ activateOnTyping: true }), keymap.of(completionKeymap)],
  java: [java(), oneDark, autocompletion({ activateOnTyping: true }), keymap.of(completionKeymap)],
  go: [go(), oneDark, autocompletion({ activateOnTyping: true }), keymap.of(completionKeymap)]
};

// --- Remote Cursor Widget ---
class RemoteCursorWidget extends WidgetType {
  constructor(color, label) {
    super();
    this.color = color;
    this.label = label;
  }
  toDOM() {
    const span = document.createElement("span");
    span.style.borderLeft = `2.5px solid ${this.color}`;
    span.style.marginLeft = "-2px";
    span.style.height = "1.2em";
    span.style.display = "inline-block";
    span.style.position = "relative";
    span.style.zIndex = "10";
    span.style.boxShadow = `0 0 6px 2px ${this.color}55`;
    span.title = this.label;
    return span;
  }
}
function remoteCursorExtension(cursors) {
  return EditorView.decorations.compute([], state => {
    const builder = new RangeSetBuilder();
    const sortedCursors = Object.entries(cursors)
      .filter(([userId, { cursor }]) => typeof cursor === "number" && cursor >= 0 && cursor <= state.doc.length)
      .sort((a, b) => a[1].cursor - b[1].cursor);
    sortedCursors.forEach(([userId, { cursor }], i) => {
      builder.add(
        cursor,
        cursor,
        Decoration.widget({
          widget: new RemoteCursorWidget(
            ["#e06c75", "#98c379", "#61afef", "#c678dd", "#56b6c2"][i % 5],
            userId.slice(0, 6)
          ),
          side: 1
        })
      );
    });
    return builder.finish();
  });
}

// --- Main Component ---
const CollaborativeEditor = () => {
  const { roomId } = useParams();
  const [files, setFiles] = useState([{ name: "main.js", content: "// Start coding..." }]);
  const [activeFile, setActiveFile] = useState("main.js");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chat, setChat] = useState([]);
  const [aiChat, setAiChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [users, setUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });
  const [showUserJoinNotification, setShowUserJoinNotification] = useState(false);
  const [joinedUser, setJoinedUser] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const [chatMode, setChatMode] = useState("ai");

  // --- Resizer logic for bottom panel ---
  const [outputPanelHeight, setOutputPanelHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  const minOutputPanelHeight = 90;
  const maxOutputPanelHeight = 500;

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // --- Resizer logic for right panel ---
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const minRightPanelWidth = 240;
  const maxRightPanelWidth = 500;

  const startResizingRight = (e) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  // --- Resizer logic for left panel ---
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);
  const minExplorerWidth = 40;
  const maxExplorerWidth = 400;

  const startResizingExplorer = (e) => {
    e.preventDefault();
    setIsResizingExplorer(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
    setIsResizingRight(false);
    setIsResizingExplorer(false);
  };

  const resizePanels = (e) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY - 40; // 40px for the top bar
      if (newHeight >= minOutputPanelHeight && newHeight <= maxOutputPanelHeight) {
        setOutputPanelHeight(newHeight);
      }
    }
    if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= minRightPanelWidth && newWidth <= maxRightPanelWidth) {
        setRightPanelWidth(newWidth);
      }
    }
    if (isResizingExplorer) {
      const newWidth = e.clientX;
      if (newWidth >= minExplorerWidth && newWidth <= maxExplorerWidth) {
        setExplorerWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mousemove", resizePanels);
    document.addEventListener("mouseup", stopResizing);
    return () => {
      document.removeEventListener("mousemove", resizePanels);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, isResizingRight, isResizingExplorer]);

  // --- Collapsible Sidebars ---
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const chatBoxRef = useRef(null);
  const aiChatBoxRef = useRef(null);

  const currentFile = files.find(f => f.name === activeFile) || { content: "" };

  // --- Socket and AI logic ---
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Hello there!";
    if (hour < 12) greeting = "Good morning!";
    else if (hour < 17) greeting = "Good afternoon!";
    else greeting = "Good evening!";
    setAiChat([{
      user: "AI",
      msg: `${greeting} I'm your coding assistant! 👋\n\nI'm here to help you with:\n• Code explanations and debugging\n• Algorithm optimization\n• Best practices and patterns\n• Project architecture advice\n\nWhat would you like to work on today?`,
      timestamp: new Date(),
      type: "greeting"
    }]);
  }, []);

  useEffect(() => {
    const userName = localStorage.getItem("name") || "User";
    socket.emit("joinRoom", { roomId, userName });

    socket.on("codeChange", data => {
      if (data.roomId === roomId) {
        setFiles(files => files.map(f => f.name === data.fileName ? { ...f, content: data.code } : f));
      }
    });

    socket.on("chatMessage", (msg) => {
      setChat(prevChat => [...prevChat, { ...msg, timestamp: new Date() }]);
    });

    socket.on("chatHistory", (history) => {
      setChat(chat => chat.length === 0 ? history : chat);
    });

    socket.on("userList", (userList) => {
      const realUsers = userList.filter(user => user !== "AI");
      setUsers(realUsers);
    });

    socket.on("userJoined", ({ user }) => {
      setJoinedUser(user);
      setShowUserJoinNotification(true);
      setTimeout(() => {
        setAiChat(prev => [...prev, {
          user: "AI",
          msg: `Hey! 👋 ${user} just joined the room!\n\nWelcome aboard! Feel free to ask me anything about coding.`,
          timestamp: new Date(),
          type: "welcome"
        }]);
      }, 1000);
      setTimeout(() => setShowUserJoinNotification(false), 5000);

      setChat((msgs) => [
        ...msgs,
        { type: "system", text: `${user} joined the chat.` }
      ]);
      toast.info(`${user} joined the chat!`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        style: { background: "#222236", color: "#fff", borderRadius: "8px" }
      });
    });

    socket.on("remoteCursor", ({ userId, cursor, selection }) => {
      setRemoteCursors(prev => ({ ...prev, [userId]: { cursor, selection } }));
    });

    socket.on("error", (msg) => {
      console.error("Socket error:", msg);
      setError(msg);
    });
    
    socket.on("languageChange", ({ language }) => setLanguage(language));

    socket.on("aiThinking", ({ roomId: eventRoomId }) => {
      if (eventRoomId === roomId) setAiThinking(true);
    });

    socket.on("aiResponse", ({ success, message }) => {
      setAiThinking(false);
      if (success) {
        setAiChat(prev => [...prev, {
          user: "AI",
          msg: message,
          timestamp: new Date(),
          type: "response"
        }]);
      } else {
        setError(message);
      }
    });

    return () => {
      socket.off("codeChange");
      socket.off("chatMessage");
      socket.off("chatHistory");
      socket.off("userList");
      socket.off("userJoined");
      socket.off("remoteCursor");
      socket.off("error");
      socket.off("languageChange");
      socket.off("aiThinking");
      socket.off("aiResponse");
    };
  }, [roomId]);

  // --- Editor, File, and Chat Logic ---
  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const sendCodeChange = debounce((code) => {
    socket.emit("codeChange", { roomId, code, fileName: activeFile });
  }, 300);

  const handleChange = (value) => {
    setFiles(files => files.map(f => f.name === activeFile ? { ...f, content: value } : f));
    sendCodeChange(value);
  };

  const userName = localStorage.getItem("name") || "You";
  const sendChat = async (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const userMessage = { user: userName, msg: chatInput, timestamp: new Date() };
      setChat(chat => [...chat, userMessage]);
      socket.emit("chatMessage", {
        roomId,
        user: userName,
        msg: chatInput
      });
      setChatInput("");
    }
  };

  const sendAIChat = async (e) => {
    e.preventDefault();
    if (aiInput.trim()) {
      const userMessage = { user: userName, msg: aiInput, timestamp: new Date() };
      setAiChat(chat => [...chat, userMessage]);
      socket.emit("askAI", {
        roomId,
        prompt: aiInput,
        selectedCode: selectedCode || currentFile.content,
        filePath: activeFile,
        language
      });
      setAiInput("");
    }
  };

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat]);
  useEffect(() => {
    if (aiChatBoxRef.current) aiChatBoxRef.current.scrollTop = aiChatBoxRef.current.scrollHeight;
  }, [aiChat]);
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // --- File/Tab/Session/Context Menu Logic ---
  const handleRunCode = async () => {
    setIsLoading(true);
    setOutput("Running...");
    setError(null);
    try {
      const response = await axios.post("http://localhost:3001/run", {
        language,
        code: currentFile.content
      });
      setOutput(response.data.output);
    } catch (err) {
      console.error("Error executing code:", err);
      if (err.response) {
        setOutput(`Error: ${err.response.data.output}`);
      } else {
        setOutput("Error connecting to code runner. Check if the backend is running.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    toast.success("Code copied to clipboard!");
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Room link copied to clipboard!");
  };

  const handleSaveSession = async () => {
    const sessionId = prompt("Enter a name for this session:");
    if (!sessionId) return;
    try {
      await axios.post("http://localhost:3001/api/save-session", { sessionId, files });
      toast.success("Session saved!");
    } catch (e) {
      toast.error("Failed to save session.");
    }
  };

  const handleLoadSession = async () => {
    const sessionId = prompt("Enter the session name to load:");
    if (!sessionId) return;
    try {
      const response = await axios.get(`http://localhost:3001/api/load-session/${sessionId}`);
      const data = response.data;
      if (data.files) {
        setFiles(data.files);
        setActiveFile(data.files[0].name); // Fix: Set active file to the first one in the loaded session
        toast.success("Session loaded!");
      } else {
        toast.error("Session not found.");
      }
    } catch (e) {
      toast.error("Failed to load session.");
    }
  };

  const addFile = () => {
    let base = "untitled";
    let i = 1;
    let ext = language === "python" ? ".py" : language === "java" ? ".java" : language === "go" ? ".go" : language === "c" ? ".c" : language === "cpp" ? ".cpp" : ".js";
    let name = `${base}${i}${ext}`;
    while (files.some(f => f.name === name)) {
      i++;
      name = `${base}${i}${ext}`;
    }
    setFiles([...files, { name, content: "" }]);
    setActiveFile(name);
  };

  const renameFile = (oldName, newName) => {
    if (!newName || files.some(f => f.name === newName)) return;
    setFiles(files => files.map(f => f.name === oldName ? { ...f, name: newName } : f));
    setActiveFile(newName);
  };

  const deleteFile = (name) => {
    if (files.length === 1) return;
    const remainingFiles = files.filter(f => f.name !== name);
    setFiles(remainingFiles);
    if (activeFile === name) {
      setActiveFile(remainingFiles[0]?.name || "");
    }
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    socket.emit("languageChange", { roomId, language: e.target.value });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY });
  };
  const closeContextMenu = () => setContextMenu({ show: false, x: 0, y: 0 });

  const askAIAboutSelection = () => {
    if (selectedCode.trim()) {
      const prompt = `Please explain this code: ${selectedCode}`;
      setAiChat(prev => [...prev, { user: userName, msg: prompt, timestamp: new Date() }]);
      socket.emit("askAI", { roomId, prompt, selectedCode, filePath: activeFile, language });
      closeContextMenu();
    }
  };
  const askAIForHelp = () => {
    const prompt = `I need help with this code. Can you suggest improvements or identify any issues?`;
    setAiChat(prev => [...prev, { user: userName, msg: prompt, timestamp: new Date() }]);
    socket.emit("askAI", { roomId, prompt, selectedCode: selectedCode || currentFile.content, filePath: activeFile, language });
    closeContextMenu();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- VS Code-style Tabs ---
  const closeTab = (name) => {
    if (files.length === 1) return;
    deleteFile(name);
  };

  const renderMessageContent = (msg) => {
    if (!msg) return null;
    const parts = msg.split(/```/);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const lines = part.trim().split('\n');
        const lang = lines[0].trim();
        const code = lines.slice(1).join('\n').trim();
        const handleCopy = () => {
          navigator.clipboard.writeText(code);
          toast.success("Code copied to clipboard!", { autoClose: 1000, hideProgressBar: true });
        };
        return (
          <div key={index} className="vsc-chat-codeblock">
            <div className="vsc-chat-code-header">
              <span>{lang || 'Code'}</span>
              <button onClick={handleCopy} className="vsc-copy-btn">
                <VscCopy /> Copy code
              </button>
            </div>
            <pre className="vsc-chat-code-content">
              <code>{code}</code>
            </pre>
          </div>
        );
      } else {
        return <span key={index}>{part}</span>;
      }
    });
  };

  const renderChatBubble = (c, isAI, isSelf) => {
    const icon = isAI ? <FaRobot /> : <FaUserCircle />;
    const userNameDisplay = isAI ? 'AI Assistant' : c.user;
    return (
      <div key={c.timestamp + (c.user === "AI" ? "ai" : "user")} className={`vsc-chat-message ${isAI ? 'vsc-ai-message' : 'vsc-user-message'}`}>
        <div className="vsc-chat-avatar">{icon}</div>
        <div className="vsc-chat-content">
          <div className="vsc-chat-header">
            <span className="vsc-chat-user">{userNameDisplay}</span>
            <span className="vsc-chat-time">{formatTime(c.timestamp)}</span>
          </div>
          <div className="vsc-chat-text">{renderMessageContent(c.msg)}</div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="vsc-root">
      {/* VS Code Top Bar */}
      <div className="vsc-topbar">
        <div className="vsc-topbar-left">
          <span className="vsc-title">Live Code Editor</span>
          <span className="vsc-divider" />
          <span className="vsc-label">Language:</span>
          <select
            className="vsc-select"
            value={language}
            onChange={handleLanguageChange}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>
        <div className="vsc-topbar-right">
          <span className="vsc-users">{users.length} user{users.length !== 1 ? "s" : ""} online</span>
        </div>
      </div>

      <div className="vsc-main">
        {/* Explorer Sidebar */}
        <div className={`vsc-sidebar${explorerOpen ? "" : " closed"}`} style={{ width: explorerOpen ? `${explorerWidth}px` : '40px' }}>
          <div className="vsc-sidebar-header">
            <button
              className="vsc-sidebar-toggle"
              onClick={() => setExplorerOpen(v => !v)}
              title={explorerOpen ? "Collapse Explorer" : "Expand Explorer"}
            >
              {explorerOpen ? <VscChevronLeft /> : <VscChevronRight />}
            </button>
            {explorerOpen && (
              <>
                <span className="vsc-sidebar-title"><VscFiles /> Explorer</span>
                <button className="vsc-sidebar-action" onClick={addFile} title="New File">
                  <VscNewFile />
                </button>
              </>
            )}
          </div>
          {explorerOpen && (
            <div className="vsc-sidebar-files">
              {files.map(f => (
                <div
                  key={f.name}
                  className={`vsc-sidebar-file${f.name === activeFile ? " active" : ""}`}
                  onClick={() => setActiveFile(f.name)}
                >
                  <span className="vsc-file-icon">📄</span>
                  <span className="vsc-file-name">{f.name}</span>
                  <div className="vsc-file-actions">
                    <button
                      className="vsc-file-action"
                      onClick={e => {
                        e.stopPropagation();
                        const newName = prompt("Rename file:", f.name);
                        if (newName && newName !== f.name) renameFile(f.name, newName);
                      }}
                      title="Rename"
                    >
                      <VscEdit />
                    </button>
                    {files.length > 1 && (
                      <button
                        className="vsc-file-action"
                        onClick={e => {
                          e.stopPropagation();
                          deleteFile(f.name);
                        }}
                        title="Delete"
                      >
                        <VscTrash />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="vsc-resize-bar-vertical" onMouseDown={startResizingExplorer} />
        {/* Main Editor Area */}
        <div className="vsc-editor-area">
          {/* Tabs */}
          <div className="vsc-tabs">
            {files.map(f => (
              <div
                key={f.name}
                className={`vsc-tab${f.name === activeFile ? " active" : ""}`}
                onClick={() => setActiveFile(f.name)}
              >
                <span className="vsc-tab-icon">📄</span>
                <span className="vsc-tab-name">{f.name}</span>
                {files.length > 1 && (
                  <button
                    className="vsc-tab-close"
                    onClick={e => {
                      e.stopPropagation();
                      closeTab(f.name);
                    }}
                    title="Close"
                  >
                    <VscClose />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* CodeMirror Editor */}
          <div className="vsc-codemirror" onContextMenu={handleContextMenu}>
            <CodeMirror
              value={typeof currentFile.content === "string" ? currentFile.content : ""}
              height="100%"
              extensions={[
                ...(EXTENSIONS[language] || [oneDark, autocompletion()]),
                remoteCursorExtension(remoteCursors)
              ]}
              onChange={handleChange}
              theme="dark"
              style={{
                fontSize: "14px",
                height: "100%",
                background: "#1e1e1e",
                fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace"
              }}
              onUpdate={viewUpdate => {
                const cursor = viewUpdate.state.selection.main.head;
                const selection = {
                  from: viewUpdate.state.selection.main.from,
                  to: viewUpdate.state.selection.main.to
                };
                if (selection.from !== selection.to) {
                  const selectedText = viewUpdate.state.doc.sliceString(selection.from, selection.to);
                  setSelectedCode(selectedText);
                } else {
                  setSelectedCode("");
                }
                socket.emit("cursorChange", {
                  roomId,
                  userId: socket.id,
                  cursor,
                  selection
                });
              }}
            />
          </div>
          <div className="vsc-resize-bar-horizontal" onMouseDown={startResizing} />
          {/* Output Panel */}
          <div className="vsc-output-panel" style={{ height: `${outputPanelHeight}px` }}>
            <div className="vsc-output-header">
              <span>OUTPUT</span>
              <div className="vsc-output-actions">
                <button onClick={handleRunCode}>▶ Run</button>
                <button onClick={handleCopyCode}>📋 Copy</button>
                <button onClick={handleDownloadFile}>💾 Save</button>
                <button onClick={handleShareLink}>🔗 Share</button>
                <button onClick={handleSaveSession}>💾 Save Session</button>
                <button onClick={handleLoadSession}>📂 Load Session</button>
              </div>
            </div>
            <div className="vsc-output-content">
              {output}
              {isLoading && <Spinner />}
              {error && <div className="vsc-error">❌ {error}</div>}
            </div>
          </div>
        </div>
        <div className="vsc-resize-bar-vertical" onMouseDown={startResizingRight} />
        {/* Right Panel: AI/Chat */}
        <div className={`vsc-right-panel${rightPanelOpen ? "" : " closed"}`} style={{ width: `${rightPanelOpen ? rightPanelWidth : 40}px` }}>
          <div className="vsc-right-header">
            <button
              className="vsc-right-toggle"
              onClick={() => setRightPanelOpen(v => !v)}
              title={rightPanelOpen ? "Collapse Chat/AI" : "Expand Chat/AI"}
            >
              {rightPanelOpen ? <VscChevronRight /> : <VscChevronLeft />}
            </button>
            {rightPanelOpen && (
              <>
                <span className="vsc-right-title">
                  <VscSymbolKeyword style={{ marginRight: 4 }} />
                  AI Assistant
                </span>
                <div className="vsc-right-tabs">
                  <button
                    className={`vsc-right-tab${chatMode === "ai" ? " active" : ""}`}
                    onClick={() => setChatMode("ai")}
                  >
                    <VscSymbolKeyword /> AI Chat
                  </button>
                  <button
                    className={`vsc-right-tab${chatMode === "group" ? " active" : ""}`}
                    onClick={() => setChatMode("group")}
                  >
                    <VscCommentDiscussion /> Group Chat
                  </button>
                </div>
              </>
            )}
          </div>
          {rightPanelOpen && (
            <>
              <div className="vsc-right-content" ref={chatMode === "ai" ? aiChatBoxRef : chatBoxRef}>
                {chatMode === "ai"
                  ? aiChat.map((c, i) =>
                      renderChatBubble(c, c.user === "AI", c.user === userName)
                    )
                  : chat.map((c, i) =>
                      renderChatBubble(c, false, c.user === userName)
                    )}
                {aiThinking && chatMode === "ai" && (
                  <div className="vsc-ai-thinking">AI is thinking...</div>
                )}
              </div>
              <div className="vsc-right-input">
                <form onSubmit={chatMode === "ai" ? sendAIChat : sendChat}>
                  <input
                    value={chatMode === "ai" ? aiInput : chatInput}
                    onChange={e =>
                      chatMode === "ai"
                        ? setAiInput(e.target.value)
                        : setChatInput(e.target.value)
                    }
                    placeholder={chatMode === "ai" ? "Ask AI..." : "Type message..."}
                  />
                  <button
                    type="submit"
                    disabled={!((chatMode === "ai" ? aiInput : chatInput).trim())}
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Join Notification */}
      {showUserJoinNotification && (
        <div className="vsc-join-notification">
          <div>
            <strong>User joined</strong>
            <div>{joinedUser}</div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="vsc-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={closeContextMenu}
        >
          <div onClick={askAIAboutSelection}>🤖 Ask AI about selection</div>
          <div onClick={askAIForHelp}>🤖 Ask AI for help</div>
          <div
            onClick={() => {
              navigator.clipboard.writeText(selectedCode);
              closeContextMenu();
            }}
          >
            📋 Copy selection
          </div>
        </div>
      )}
      {contextMenu.show && (
        <div className="vsc-context-backdrop" onClick={closeContextMenu} />
      )}

      {/* VS Code Theme Styles */}
      <style>{`
      .vsc-root {
        font-family: 'Segoe UI', 'Arial', sans-serif;
        background: #1e1e1e;
        color: #cccccc;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .vsc-topbar {
        background: #23272e;
        border-bottom: 1px solid #252526;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        font-size: 14px;
        font-family: 'Segoe UI', 'Arial', sans-serif;
      }
      .vsc-topbar-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .vsc-title {
        color: #fff;
        font-weight: 600;
        font-size: 15px;
        letter-spacing: 0.5px;
      }
      .vsc-divider {
        width: 1px;
        height: 18px;
        background: #333;
        margin: 0 12px;
      }
      .vsc-label {
        color: #cccccc;
        font-size: 13px;
      }
      .vsc-select {
        background: #23272e;
        color: #cccccc;
        border: 1px solid #252526;
        border-radius: 3px;
        padding: 3px 10px;
        font-size: 13px;
        outline: none;
        margin-left: 4px;
      }
      .vsc-select:focus {
        border-color: #007acc;
      }
      .vsc-topbar-right {
        color: #cccccc;
        font-size: 13px;
      }
      .vsc-users {
        color: #cccccc;
        font-size: 13px;
      }
      .vsc-main {
        flex: 1;
        display: flex;
        min-height: 0;
        background: #1e1e1e;
      }
      .vsc-sidebar {
        min-width: 40px;
        background: #21222c;
        border-right: 1px solid #232336;
        transition: width 0.25s cubic-bezier(.4,2,.6,1);
        box-shadow: 2px 0 8px #0002;
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      .vsc-sidebar.closed {
        width: 40px;
        min-width: 40px;
        overflow: hidden;
      }
      .vsc-sidebar-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-bottom: 1px solid #232336;
        background: #23272e;
      }
      .vsc-sidebar-toggle {
        background: none;
        border: none;
        color: #8a8fa3;
        font-size: 1.5em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        border-radius: 4px;
        padding: 2px 4px;
      }
      .vsc-sidebar-toggle:hover {
        background: #232336;
      }
      .vsc-sidebar-title {
        color: #cccccc;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .vsc-sidebar-action {
        background: none;
        border: none;
        color: #8a8fa3;
        font-size: 1.2em;
        cursor: pointer;
        border-radius: 4px;
        padding: 2px 4px;
      }
      .vsc-sidebar-action:hover {
        background: #232336;
        color: #007acc;
      }
      .vsc-sidebar-files {
        flex: 1;
        overflow-y: auto;
        padding: 6px 0;
      }
      .vsc-sidebar-file {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 14px;
        background: none;
        color: #cccccc;
        cursor: pointer;
        border-radius: 4px;
        font-size: 13px;
        transition: background 0.15s;
        margin-bottom: 2px;
      }
      .vsc-sidebar-file.active, .vsc-sidebar-file:hover {
        background: #23272e;
        color: #fff;
      }
      .vsc-file-icon {
        font-size: 15px;
      }
      .vsc-file-actions {
        display: flex;
        gap: 2px;
        margin-left: auto;
      }
      .vsc-file-action {
        background: none;
        border: none;
        color: #8a8fa3;
        font-size: 1em;
        cursor: pointer;
        border-radius: 3px;
        padding: 2px 3px;
      }
      .vsc-file-action:hover {
        background: #232336;
        color: #007acc;
      }
      .vsc-editor-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: #1e1e1e;
      }
      .vsc-tabs {
        background: #23272e;
        border-bottom: 1px solid #232336;
        display: flex;
        align-items: center;
        height: 36px;
        gap: 0;
        padding-left: 8px;
      }
      .vsc-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 18px 0 10px;
        height: 36px;
        background: none;
        color: #cccccc;
        cursor: pointer;
        border-right: 1px solid #232336;
        font-size: 13px;
        position: relative;
        transition: background 0.15s;
      }
      .vsc-tab.active {
        background: #1e1e1e;
        color: #fff;
        border-bottom: 2px solid #007acc;
      }
      .vsc-tab-close {
        background: none;
        border: none;
        color: #8a8fa3;
        font-size: 1em;
        cursor: pointer;
        border-radius: 3px;
        padding: 2px 3px;
        margin-left: 6px;
      }
      .vsc-tab-close:hover {
        background: #232336;
        color: #e06c75;
      }
      .vsc-codemirror {
        flex: 1;
        min-height: 0;
        background: #1e1e1e;
        font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
        border-bottom: 1px solid #232336;
      }
      .vsc-resize-bar-horizontal {
        height: 6px;
        background: #23272e;
        cursor: ns-resize;
        transition: background 0.2s;
        z-index: 100;
        border-top: 1px solid #252526;
        border-bottom: 1px solid #252526;
      }
      .vsc-resize-bar-horizontal:hover {
        background: #007acc;
      }
      .vsc-resize-bar-vertical {
        width: 6px;
        background: #23272e;
        cursor: ew-resize;
        transition: background 0.2s;
        z-index: 100;
        border-left: 1px solid #252526;
        border-right: 1px solid #252526;
      }
      .vsc-resize-bar-vertical:hover {
        background: #007acc;
      }
      .vsc-output-panel {
        background: #23272e;
        border-top: 1px solid #232336;
        min-height: 90px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
      }
      .vsc-output-header {
        background: #23272e;
        color: #cccccc;
        font-size: 13px;
        font-weight: 600;
        padding: 6px 14px;
        border-bottom: 1px solid #232336;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .vsc-output-actions button {
        background: #232336;
        color: #cccccc;
        border: none;
        border-radius: 3px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        margin-left: 4px;
        transition: background 0.15s, color 0.15s;
      }
      .vsc-output-actions button:hover {
        background: #007acc;
        color: #fff;
      }
      .vsc-output-content {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
        font-size: 13px;
        color: #d4d4d4;
        background: #1e1e1e;
      }
      .vsc-error {
        color: #e06c75;
        margin-top: 8px;
      }
      .vsc-right-panel {
        min-width: 40px;
        background: #232336;
        border-left: 1px solid #232336;
        transition: width 0.25s cubic-bezier(.4,2,.6,1);
        box-shadow: -2px 0 8px #0002;
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      .vsc-right-panel.closed {
        width: 40px;
        min-width: 40px;
        overflow: hidden;
      }
      .vsc-right-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-bottom: 1px solid #232336;
        background: #23272e;
      }
      .vsc-right-toggle {
        background: none;
        border: none;
        color: #8a8fa3;
        font-size: 1.5em;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        border-radius: 4px;
        padding: 2px 4px;
      }
      .vsc-right-toggle:hover {
        background: #232336;
      }
      .vsc-right-title {
        color: #cccccc;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .vsc-right-tabs {
        display: flex;
        gap: 2px;
        margin-left: auto;
      }
      .vsc-right-tab {
        background: none;
        border: none;
        color: #cccccc;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
        transition: background 0.15s, color 0.15s;
      }
      .vsc-right-tab.active, .vsc-right-tab:hover {
        background: #007acc;
        color: #fff;
      }
      .vsc-right-content {
        flex: 1;
        overflow-y: auto;
        background: #1e1e1e;
        padding: 14px 12px 12px 12px;
        font-size: 13px;
        font-family: 'Segoe UI', 'Arial', sans-serif;
        box-shadow: 0 2px 8px #0002;
      }
      .vsc-ai-thinking {
        color: #4ec9b0;
        font-size: 13px;
        font-style: italic;
        padding: 8px;
      }
      .vsc-right-input {
        padding: 10px 12px;
        border-top: 1px solid #232336;
        background: #23272e;
      }
      .vsc-right-input form {
        display: flex;
        gap: 6px;
      }
      .vsc-right-input input {
        flex: 1;
        background: #1e1e1e;
        color: #cccccc;
        border: 1px solid #232336;
        border-radius: 3px;
        padding: 7px 10px;
        font-size: 13px;
        outline: none;
      }
      .vsc-right-input input:focus {
        border-color: #007acc;
      }
      .vsc-right-input button {
        background: #007acc;
        color: #fff;
        border: none;
        border-radius: 3px;
        padding: 7px 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.15s;
      }
      .vsc-right-input button:disabled {
        background: #232336;
        color: #888;
        cursor: not-allowed;
      }
      .vsc-join-notification {
        position: fixed;
        top: 60px;
        right: 28px;
        background: #232336;
        color: #cccccc;
        padding: 14px 18px;
        border-radius: 6px;
        border: 1px solid #232336;
        z-index: 1000;
        max-width: 280px;
        font-size: 13px;
        box-shadow: 0 2px 12px #0006;
        animation: vsc-fadein 0.3s;
      }
      @keyframes vsc-fadein {
        from { opacity: 0; transform: translateY(-10px);}
        to { opacity: 1; transform: translateY(0);}
      }
      .vsc-context-menu {
        position: fixed;
        background: #232336;
        border: 1px solid #232336;
        border-radius: 6px;
        padding: 4px 0;
        box-shadow: 0 4px 16px #0008;
        z-index: 1000;
        min-width: 200px;
        font-size: 13px;
      }
      .vsc-context-menu div {
        padding: 10px 18px;
        cursor: pointer;
        color: #cccccc;
        border-bottom: 1px solid #232336;
        transition: background 0.15s;
      }
      .vsc-context-menu div:last-child {
        border-bottom: none;
      }
      .vsc-context-menu div:hover {
        background: #007acc;
        color: #fff;
      }
      .vsc-context-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 999;
      }
      /* VS Code Scrollbars */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
        background: #232336;
      }
      ::-webkit-scrollbar-thumb {
        background: #2a2d2e;
        border-radius: 0px;
        border: 2px solid #232336;
        box-shadow: none;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #3c3f41;
      }
      ::-webkit-scrollbar-track {
        background: #232336;
        border-radius: 0px;
      }
      ::-webkit-scrollbar-corner {
        background: #232336;
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: #2a2d2e #232336;
      }

      /* New Chat Styles */
      .vsc-chat-message {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 24px;
      }
      .vsc-chat-message.vsc-user-message {
        flex-direction: row;
      }
      .vsc-chat-message.vsc-ai-message {
        flex-direction: row;
      }
      .vsc-chat-avatar {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: #fff;
        border-radius: 50%;
        background-color: #007acc;
      }
      .vsc-ai-message .vsc-chat-avatar {
        background-color: #4ec9b0;
      }
      .vsc-chat-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .vsc-chat-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .vsc-chat-user {
        font-weight: 600;
        font-size: 14px;
        color: #fff;
      }
      .vsc-chat-time {
        font-size: 12px;
        color: #8a8fa3;
      }
      .vsc-chat-text {
        color: #cccccc;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .vsc-chat-codeblock {
        background: #0d0d0d;
        border: 1px solid #252526;
        border-radius: 6px;
        margin-top: 12px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .vsc-chat-code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #23272e;
        padding: 6px 12px;
        font-size: 12px;
        color: #8a8fa3;
        font-weight: 500;
        border-bottom: 1px solid #252526;
      }
      .vsc-copy-btn {
        background: #3c3f41;
        color: #cccccc;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background 0.15s, color 0.15s;
      }
      .vsc-copy-btn:hover {
        background: #007acc;
        color: #fff;
      }
      .vsc-chat-code-content {
        padding: 12px;
        overflow-x: auto;
      }
      .vsc-chat-code-content code {
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 13px;
      }
      `}</style>
    </div>
  );
};

export default CollaborativeEditor;
