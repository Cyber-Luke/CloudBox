/**
 * CloudBox Frontend Application
 * Modern JavaScript implementation with proper error handling and structure
 */

class CloudBoxApp {
  constructor() {
    this.API_BASE_URL =
      window.API_BASE_URL ||
      window.location.protocol +
        "//" +
        window.location.hostname +
        ":" +
        window.location.port +
        "/api";

    this.currentPath = ""; // current directory path
    this.activeFilePath = null; // currently viewed file path (null if viewing directory)
    this.activeFileType = null;
    this.authToken = null;
    this.autoLogoutTimer = null;
    this.TIMEOUT_DURATION = 600000; // 10 minutes
    this.activeRequests = 0; // track concurrent requests for loading overlay

    this.init();
  }

  // Helper: build absolute URL for history based on directory path and optional file
  buildAbsoluteUrl(path, fileName = null) {
    const cleaned = (path || "").split("/").filter(Boolean);
    if (fileName) cleaned.push(fileName);
    const urlPath = "/" + cleaned.map(encodeURIComponent).join("/");
    return urlPath === "/" ? "/" : urlPath;
  }

  init() {
    this.setupEventListeners();
    this.setupDialogHandlers();
    this.resetAutoLogoutTimer();
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Add/Create form
    const addForm = document.getElementById("addForm");
    if (addForm) {
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAddSubmit();
      });
    }

    // Upload form
    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
      uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleUpload();
      });
    }

    // Edit form
    const editForm = document.getElementById("editForm");
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleTextEdit();
      });
    }

    // Toggle for text/folder creation
    const checkbox = document.getElementById("checkbox");
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        this.toggleTextInput();
      });
    }

    // Action buttons
    document
      .getElementById("logout")
      ?.addEventListener("click", () => this.handleLogout());
    document
      .getElementById("back")
      ?.addEventListener("click", () => this.handleBack());

    // Browser navigation
    window.addEventListener("popstate", (event) => {
      this.handlePopState(event);
    });

    // Activity detection for auto-logout
    document.addEventListener("mousemove", () => this.resetAutoLogoutTimer());
    document.addEventListener("keypress", () => this.resetAutoLogoutTimer());
  }

  setupDialogHandlers() {
    // Dialog open buttons
    document.querySelectorAll("[data-dialog-open]").forEach((button) => {
      button.addEventListener("click", (e) => {
        const dialogId = e.target.getAttribute("data-dialog-open");
        const dialog = document.getElementById(dialogId);
        if (dialog) {
          dialog.showModal();
          e.target.style.display = "none";
        }
      });
    });

    // Dialog close buttons
    document.querySelectorAll("[data-dialog-close]").forEach((button) => {
      button.addEventListener("click", (e) => {
        const dialogId = e.target.getAttribute("data-dialog-close");
        const dialog = document.getElementById(dialogId);
        if (dialog) {
          dialog.close();
          this.resetDialogButtons();
        }
      });
    });

    // Close dialogs on backdrop click
    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          dialog.close();
          this.resetDialogButtons();
        }
      });
    });
  }

  resetDialogButtons() {
    document.getElementById("add").style.display = "inline-block";
    document.getElementById("upload").style.display = "inline-block";
  }

  toggleTextInput() {
    const checkbox = document.getElementById("checkbox");
    const textArea = document.getElementById("btext");

    if (checkbox.checked) {
      textArea.style.display = "block";
      textArea.required = true;
    } else {
      textArea.style.display = "none";
      textArea.required = false;
      textArea.value = "";
    }
  }

  resetAutoLogoutTimer() {
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
    }

    if (this.authToken) {
      this.autoLogoutTimer = setTimeout(() => {
        this.handleLogout();
        this.showNotification(
          "Automatischer Logout wegen Inaktivität.",
          "warning"
        );
      }, this.TIMEOUT_DURATION);
    }
  }

  async handleLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      this.showNotification("Bitte alle Felder ausfüllen.", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await this.makeRequest(`${this.API_BASE_URL}/login`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = "Basic " + btoa(`${username}:${data.token}`);
        sessionStorage.setItem("authcode", this.authToken);

        this.showMainPage();
        this.loadData("");
        this.resetAutoLogoutTimer();
      } else {
        this.handleLoginError(username, password);
      }
    } catch (error) {
      console.error("Login error:", error);
      this.showNotification("Verbindung zum Server fehlgeschlagen.", "error");
    }
  }

  handleLoginError(username, password) {
    if (username !== "admin" && password === "admin") {
      this.showNotification("Falscher Benutzername!", "error");
    } else if (password !== "admin" && username === "admin") {
      this.showNotification("Falsches Passwort!", "error");
    } else if (password !== "admin" && username !== "admin") {
      this.showNotification("Benutzername und Passwort falsch!", "error");
    } else {
      this.showNotification("Login fehlgeschlagen.", "error");
    }
  }

  async handleLogout() {
    try {
      await this.makeRequest(`${this.API_BASE_URL}/logout`, {
        method: "GET",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearSession();
      this.showLoginPage();
    }
  }

  clearSession() {
    sessionStorage.clear();
    this.authToken = null;
    this.currentPath = "";
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
    }
    document.getElementById("ordnercontent").innerHTML = "";
  }

  showLoginPage() {
    document.getElementById("page").style.display = "none";
    document.getElementById("login").style.display = "flex";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    this.hideFileActions();
  }

  showMainPage() {
    document.getElementById("login").style.display = "none";
    document.getElementById("page").style.display = "block";
    this.updateNavigationState();
  }

  async makeRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        Accept: "application/json",
      },
    };

    if (this.authToken && !url.includes("/login")) {
      defaultOptions.headers["Authorization"] = this.authToken;
    }

    const finalOptions = { ...defaultOptions, ...options };

    if (options.headers) {
      finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }

    // Show loading overlay while requests are in flight
    this.incrementLoading();
    try {
      const response = await fetch(url, finalOptions);
      return response;
    } finally {
      this.decrementLoading();
    }
  }

  showNotification(message, type = "info") {
    this.showToast(message, type);
  }

  // Toast notification system (UI only)
  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) {
      // fallback for environments without the container
      alert(message);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = this.getToastTitle(type);

    const msg = document.createElement("div");
    msg.className = "message";
    msg.textContent = message;

    const close = document.createElement("button");
    close.className = "close";
    close.setAttribute("aria-label", "Schließen");
    close.textContent = "✕";
    close.addEventListener("click", () => {
      container.removeChild(toast);
    });

    toast.appendChild(title);
    toast.appendChild(msg);
    toast.appendChild(close);
    container.appendChild(toast);

    // auto-hide after 4s
    setTimeout(() => {
      if (toast.parentElement === container) {
        container.removeChild(toast);
      }
    }, 4000);
  }

  getToastTitle(type) {
    switch (type) {
      case "success":
        return "Erfolg";
      case "error":
        return "Fehler";
      case "warning":
        return "Hinweis";
      default:
        return "Info";
    }
  }

  // Loading overlay helpers
  incrementLoading() {
    this.activeRequests += 1;
    const overlay = document.getElementById("loading");
    if (overlay && this.activeRequests > 0) {
      overlay.hidden = false;
    }
  }

  decrementLoading() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    const overlay = document.getElementById("loading");
    if (overlay && this.activeRequests === 0) {
      overlay.hidden = true;
    }
  }

  getFileTypeIcon(type) {
    const iconMap = {
      dir: "/assets/ordner.png",
      image: "/assets/bild.png",
      text: "/assets/text.png",
      video: "/assets/video.png",
      audio: "/assets/audio.png",
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (type.startsWith(key)) {
        return icon;
      }
    }
    return "/assets/rest.png";
  }

  updateNavigationState() {
    const backButton = document.getElementById("back");
    const logoutButton = document.getElementById("logout");
    const viewingRootDir = this.currentPath === "" && !this.activeFilePath;
    backButton.disabled = viewingRootDir;
    // Logout nur im Root-Verzeichnis und nicht beim Datei-Viewer aktiv
    logoutButton.disabled = !viewingRootDir;
  }

  updatePathDisplay() {
    const pathElement = document.getElementById("verzeichnis");
    if (this.activeFilePath) {
      pathElement.textContent = `${this.activeFilePath}`;
    } else {
      pathElement.textContent = `${this.currentPath}/`;
    }
  }

  async loadData(path, pushHistory = true) {
    try {
      // Hide file actions while (re)loading directory listings
      this.hideFileActions();
      this.activeFilePath = null;
      this.activeFileType = null;
      this.currentPath = path;
      sessionStorage.setItem("path", path);

      const response = await this.makeRequest(`${this.API_BASE_URL}/${path}`);

      if (response.ok) {
        const data = await response.json();
        this.renderFiles(data);
        this.updatePathDisplay();
        this.updateNavigationState();
        this.resetAutoLogoutTimer();

        // Update browser history
        if (pushHistory) {
          const state = { dir: path };
          const url = this.buildAbsoluteUrl(path);
          window.history.pushState(state, path, url);
        }
      } else {
        this.showNotification("Daten konnten nicht geladen werden.", "error");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      this.showNotification("Fehler beim Laden der Daten.", "error");
    }
  }

  renderFiles(files) {
    const container = document.getElementById("ordnercontent");
    container.innerHTML = "";
    this.hideFileActions();

    if (!files || files.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="empty-illustration" aria-hidden="true">📂</div>
        <h3>Dieser Ordner ist leer</h3>
        <p>Laden Sie Dateien hoch oder erstellen Sie einen Ordner oder eine Textdatei.</p>
      `;
      container.appendChild(empty);
      return;
    }

    files.forEach((file) => {
      const fileElement = this.createFileElement(file);
      container.appendChild(fileElement);
    });
  }

  createFileElement(file) {
    const div = document.createElement("div");
    div.className = "daten";
    div.dataset.name = file.Name;
    div.dataset.type = file.Type;

    const title = document.createElement("h1");
    title.textContent = file.Name;

    const img = document.createElement("img");
    img.src = this.getFileTypeIcon(file.Type);
    img.className = "img";
    img.alt = file.Type;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = `Löschen`;
    deleteBtn.className = "deletebutton";
    deleteBtn.setAttribute("aria-label", `Löschen von ${file.Name}`);

    // Event listeners
    img.addEventListener("click", () => this.handleFileClick(file));
    deleteBtn.addEventListener("click", () => this.handleFileDelete(file.Name));

    div.appendChild(title);
    div.appendChild(img);
    div.appendChild(deleteBtn);

    return div;
  }

  async handleFileClick(file) {
    if (file.Type === "dir") {
      const newPath = this.currentPath
        ? `${this.currentPath}/${file.Name}`
        : file.Name;
      this.hideFileActions();
      await this.loadData(newPath);
    } else {
      await this.displayFile(file);
    }
  }

  async displayFile(file, pushHistory = true) {
    const filePath = this.currentPath
      ? `${this.currentPath}/${file.Name}`
      : file.Name;

    try {
      const response = await this.makeRequest(
        `${this.API_BASE_URL}/${filePath}?format=base64`
      );

      if (response.ok) {
        const base64Data = await response.text();
        this.activeFilePath = filePath;
        this.activeFileType = file.Type;
        this.renderFileContent(file, base64Data);
        this.updatePathDisplay();
        this.updateNavigationState();
        if (pushHistory) {
          const state = { dir: this.currentPath, viewFile: file.Name };
          const url = this.buildAbsoluteUrl(this.currentPath, file.Name);
          window.history.pushState(state, filePath, url);
        }
        this.resetAutoLogoutTimer();
      } else {
        this.showNotification("Datei konnte nicht geladen werden.", "error");
      }
    } catch (error) {
      console.error("Error displaying file:", error);
      this.showNotification("Fehler beim Anzeigen der Datei.", "error");
    }
  }

  renderFileContent(file, base64Data) {
    const container = document.getElementById("ordnercontent");
    container.innerHTML = "";
    const viewer = document.createElement("div");
    viewer.className = "viewer";
    container.appendChild(viewer);

    const dataUrl = `data:${file.Type};base64,${base64Data}`;

    if (file.Type.startsWith("image")) {
      this.renderImage(viewer, file.Name, dataUrl);
    } else if (file.Type.startsWith("video")) {
      this.renderVideo(viewer, file.Name, dataUrl);
    } else if (file.Type.startsWith("audio")) {
      this.renderAudio(viewer, file.Name, dataUrl);
    } else if (file.Type.startsWith("text")) {
      this.renderText(viewer, file.Name, base64Data, dataUrl);
    } else {
      this.renderGenericFile(viewer, file.Name, file.Type, dataUrl);
    }

    // Show header actions (Download always; Edit only for .txt files)
    const canEdit = /\.txt$/i.test(file.Name);
    const decodedText = canEdit ? atob(base64Data) : null;
    this.showFileActions({
      downloadUrl: dataUrl,
      fileName: file.Name,
      canEdit,
      editText: decodedText,
    });

    this.disableButtons();
  }

  renderImage(container, fileName, dataUrl) {
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = fileName;
    container.appendChild(img);
  }

  renderVideo(container, fileName, dataUrl) {
    const video = document.createElement("video");
    video.controls = true;

    const source = document.createElement("source");
    source.src = dataUrl;
    video.appendChild(source);

    container.appendChild(video);
  }

  renderAudio(container, fileName, dataUrl) {
    const audio = document.createElement("audio");
    audio.controls = true;

    const source = document.createElement("source");
    source.src = dataUrl;
    audio.appendChild(source);

    container.appendChild(audio);
  }

  renderText(container, fileName, base64Data, dataUrl) {
    const pre = document.createElement("pre");
    pre.style.textAlign = "left";
    pre.style.whiteSpace = "pre-wrap";
    pre.textContent = atob(base64Data);
    container.appendChild(pre);
  }

  renderGenericFile(container, fileName, fileType, dataUrl) {
    const message1 = document.createElement("p");
    message1.textContent = "Diese Datei ist nicht sinnvoll darstellbar.";

    const message2 = document.createElement("p");
    message2.textContent = `Da es sich um einen ${fileType} Datentyp handelt.`;

    container.appendChild(message1);
    container.appendChild(message2);
  }

  createDownloadButton(fileName, dataUrl) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.className = "btn btn-primary";
    link.textContent = "Download";
    return link;
  }

  createEditButton(textContent) {
    const button = document.createElement("button");
    button.className = "btn btn-secondary";
    button.textContent = "Bearbeiten";
    button.addEventListener("click", () => {
      document.getElementById("dtext").value = textContent;
      document.getElementById("bearbeitenDialog").showModal();
      this.disableButtons();
    });
    return button;
  }

  // Header file actions (Download/Edit)
  showFileActions({ downloadUrl, fileName, canEdit, editText }) {
    const bar = document.getElementById("filebar");
    const dl = document.getElementById("downloadHeader");
    const edit = document.getElementById("editHeader");
    if (!bar || !dl || !edit) return;

    // Configure download
    dl.href = downloadUrl;
    dl.download = fileName;

    // Configure edit visibility and action
    if (canEdit) {
      edit.hidden = false;
      edit.onclick = () => {
        document.getElementById("dtext").value = editText || "";
        document.getElementById("bearbeitenDialog").showModal();
        this.disableButtons();
      };
    } else {
      edit.hidden = true;
      edit.onclick = null;
    }

    bar.hidden = false;
  }

  hideFileActions() {
    const bar = document.getElementById("filebar");
    const dl = document.getElementById("downloadHeader");
    const edit = document.getElementById("editHeader");
    if (!bar || !dl || !edit) return;
    bar.hidden = true;
    dl.removeAttribute("href");
    dl.removeAttribute("download");
    edit.hidden = true;
    edit.onclick = null;
  }

  disableButtons() {
    ["upload", "add", "logout"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
      }
    });
  }

  enableButtons() {
    ["upload", "add"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
      }
    });

    if (this.currentPath === "") {
      document.getElementById("logout").disabled = false;
    }
  }

  async handleAddSubmit() {
    const checkbox = document.getElementById("checkbox");

    if (checkbox.checked) {
      await this.handleAddText();
    } else {
      await this.handleAddFolder();
    }
  }

  async handleAddText() {
    const name = document.getElementById("ordnername").value.trim();
    const content = document.getElementById("btext").value;

    if (!name) {
      this.showNotification("Bitte geben Sie einen Namen ein.", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", btoa(content));

      const filePath = this.currentPath ? `${this.currentPath}/${name}` : name;
      const response = await this.makeRequest(
        `${this.API_BASE_URL}/${filePath}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        document.getElementById("addOrdner").close();
        this.clearAddForm();
        await this.loadData(this.currentPath);
        this.resetDialogButtons();
        this.showNotification("Textdatei erfolgreich erstellt.", "success");
      } else {
        this.showNotification(
          "Erstellen der Textdatei fehlgeschlagen.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error creating text file:", error);
      this.showNotification("Fehler beim Erstellen der Textdatei.", "error");
    }
  }

  async handleAddFolder() {
    const name = document.getElementById("ordnername").value.trim();

    if (!name) {
      this.showNotification("Bitte geben Sie einen Ordnernamen ein.", "error");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("type", "dir");

      const folderPath = this.currentPath
        ? `${this.currentPath}/${name}`
        : name;
      const response = await this.makeRequest(
        `${this.API_BASE_URL}/${folderPath}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        document.getElementById("addOrdner").close();
        this.clearAddForm();
        await this.loadData(this.currentPath);
        this.resetDialogButtons();
        this.showNotification("Ordner erfolgreich erstellt.", "success");
      } else {
        this.showNotification("Erstellen des Ordners fehlgeschlagen.", "error");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      this.showNotification("Fehler beim Erstellen des Ordners.", "error");
    }
  }

  clearAddForm() {
    document.getElementById("ordnername").value = "";
    document.getElementById("btext").value = "";
    document.getElementById("checkbox").checked = false;
    this.toggleTextInput();
  }

  async handleUpload() {
    const fileInput = document.getElementById("file");
    const file = fileInput.files[0];

    if (!file) {
      this.showNotification("Bitte wählen Sie eine Datei aus.", "error");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const binaryData = e.target.result;
        const base64String = btoa(binaryData);

        const formData = new FormData();
        formData.append("content", base64String);

        const filePath = this.currentPath
          ? `${this.currentPath}/${file.name}`
          : file.name;
        const response = await this.makeRequest(
          `${this.API_BASE_URL}/${filePath}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          document.getElementById("uploadDialog").close();
          fileInput.value = "";
          await this.loadData(this.currentPath);
          this.resetDialogButtons();
          this.showNotification("Datei erfolgreich hochgeladen.", "success");
        } else {
          this.showNotification("Upload fehlgeschlagen.", "error");
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      this.showNotification("Fehler beim Hochladen der Datei.", "error");
    }
  }

  async handleTextEdit() {
    const newContent = document.getElementById("dtext").value;
    const currentFilePath = this.activeFilePath || this.currentPath;

    try {
      // First delete the old file
      const deleteResponse = await this.makeRequest(
        `${this.API_BASE_URL}/${currentFilePath}`,
        {
          method: "DELETE",
        }
      );

      if (deleteResponse.ok) {
        // Then create new file with updated content
        const formData = new FormData();
        formData.append("content", btoa(newContent));

        const createResponse = await this.makeRequest(
          `${this.API_BASE_URL}/${currentFilePath}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (createResponse.ok) {
          document.getElementById("bearbeitenDialog").close();
          window.history.back();
          this.showNotification("Datei erfolgreich bearbeitet.", "success");
        } else {
          this.showNotification(
            "Speichern der Änderungen fehlgeschlagen.",
            "error"
          );
        }
      } else {
        this.showNotification("Bearbeiten fehlgeschlagen.", "error");
      }
    } catch (error) {
      console.error("Error editing text:", error);
      this.showNotification("Fehler beim Bearbeiten der Datei.", "error");
    }
  }

  async handleFileDelete(fileName) {
    if (!confirm(`Möchten Sie "${fileName}" wirklich löschen?`)) {
      return;
    }

    try {
      const filePath = this.currentPath
        ? `${this.currentPath}/${fileName}`
        : fileName;
      const response = await this.makeRequest(
        `${this.API_BASE_URL}/${filePath}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await this.loadData(this.currentPath);
        this.showNotification("Datei erfolgreich gelöscht.", "success");
      } else {
        this.showNotification(
          "Löschen fehlgeschlagen. Überprüfen Sie, ob der Ordner leer ist.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      this.showNotification("Fehler beim Löschen der Datei.", "error");
    }
  }

  handleBack() {
    this.hideFileActions();
    // If viewing a file, go back to its directory
    if (this.activeFilePath) {
      this.activeFilePath = null;
      this.activeFileType = null;
      this.updatePathDisplay();
      this.updateNavigationState();
      // Reload current directory (push history to directory)
      this.loadData(this.currentPath, true);
      return;
    }

    // If in a subdirectory, go to parent directory
    if (this.currentPath && this.currentPath.includes("/")) {
      const parent = this.currentPath.split("/").slice(0, -1).join("/");
      this.loadData(parent, true);
      return;
    }

    // Else go to root
    if (this.currentPath !== "") {
      this.loadData("", true);
    }
  }

  handlePopState(event) {
    this.hideFileActions();
    this.enableButtons();

    if (event.state) {
      if (event.state.viewFile && event.state.dir !== undefined) {
        // Handle returning to a specific file view
        this.currentPath = event.state.dir;
        sessionStorage.setItem("path", this.currentPath);
        // Fetch directory listing to find file type
        this.makeRequest(`${this.API_BASE_URL}/${this.currentPath}`)
          .then(async (resp) => {
            if (!resp.ok) throw new Error("listing failed");
            const list = await resp.json();
            const file = list.find((f) => f.Name === event.state.viewFile);
            if (file) {
              await this.displayFile(file, false);
            } else {
              await this.loadData(this.currentPath);
            }
          })
          .catch(async () => {
            await this.loadData(this.currentPath);
          });
      } else if (event.state.dir !== undefined) {
        this.currentPath = event.state.dir;
        sessionStorage.setItem("path", this.currentPath);
        this.loadData(this.currentPath, false);
      }
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.cloudBoxApp = new CloudBoxApp();
});
