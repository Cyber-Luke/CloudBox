var timeout;
function timer() {
  // Automatischer Logout
  window.clearTimeout(timeout); // Lösche Timeout
  timeout = setTimeout(function () {
    logout();
    alert("Automatischer Logout wegen Inaktivität.");
  }, 600000);
}

function login() {
  //Anfrage für Login
  var req = new XMLHttpRequest();
  var formData = new FormData();
  formData.append("username", document.getElementById("username").value);
  formData.append("password", document.getElementById("password").value);

  req.open("POST", API_BASE_URL + "/login", true);
  req.setRequestHeader("Accept", "text/json");
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        // Authentifizierungscode erstellen
        sessionStorage.setItem(
          "authcode",
          "Basic " +
            btoa(
              formData.get("username") + ":" + JSON.parse(this.response).token
            )
        );

        document.getElementById("page").style.display = "inline";
        document.getElementById("login").style.display = "none";
        document.getElementById("logout").style.cursor = "pointer";

        sessionStorage.setItem("path", "");
        getData("");
        document.getElementById("back").style.cursor = "not-allowed";
        document.getElementById("back").setAttribute("disabled", "");
      } else {
        // Fehlermeldungen
        if (
          document.getElementById("username").value != "admin" &&
          document.getElementById("password").value == "admin"
        ) {
          alert("Falschen Usernamen eingegeben!");
        } else if (
          document.getElementById("password").value != "admin" &&
          document.getElementById("username").value == "admin"
        ) {
          alert("Falsches Passwort eingegeben!");
        } else if (
          document.getElementById("password").value != "admin" &&
          document.getElementById("username").value != "admin"
        ) {
          alert("Passwort und Username falsch!");
        } else {
          alert("Es konnte keine Verbindung zum Server aufgebaut werden.");
        }
      }
    }
  };
  req.send(formData);
}

function logout() {
  // Anfrage für Logout
  var req = new XMLHttpRequest();
  req.open("GET", API_BASE_URL + "/logout", true);
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        sessionStorage.clear(); // Alle Daten aus dem Session Storage löschen
        document.getElementById("page").style.display = "none";
        document.getElementById("login").style.display = "inline";
        document.getElementById("ordnercontent").innerHTML = ""; // Ordnercontent löschen
      } else {
        alert("Der Logout hat leider nicht funktioniert."); // Fehlermeldung
      }
    }
  };
  req.send();
}

function showType(type) {
  // Anzeigen der verschiedenen Icons
  if (type.startsWith("dir")) {
    return "assets/ordner.png";
  } else if (type.startsWith("image")) {
    return "assets/bild.png";
  } else if (type.startsWith("text")) {
    return "assets/text.png";
  } else if (type.startsWith("video")) {
    return "assets/video.png";
  } else if (type.startsWith("audio")) {
    return "assets/audio.png";
  } else {
    return "assets/rest.png";
  }
}

function einblendenText() {
  if (document.getElementById("checkbox").checked) {
    document.getElementById("btext").style.display = "inline";
  } else {
    document.getElementById("btext").style.display = "none";
  }
}

function addAppend() {
  // Richtige Funktion aufrufen
  if (document.getElementById("checkbox").checked) {
    addText();
  } else {
    addOrdner();
  }
}

function addText() {
  // Textdokument erstellen
  let formData = new FormData();
  formData.append("content", btoa(document.getElementById("btext").value));
  path = sessionStorage.getItem("path");
  var req = new XMLHttpRequest();
  req.open(
    "POST",
    "" +
      API_BASE_URL +
      "/" +
      path +
      "/" +
      document.getElementById("ordnername").value,
    true
  );
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode")); // Token anhängen
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer();
        const state = { dir: sessionStorage.getItem("path") };
        window.history.pushState(
          state,
          sessionStorage.getItem("path"),
          sessionStorage.getItem("path")
        );
        window.history.back();
        document.getElementById("btext").value = "";
        document.getElementById("ordnername").value = "";
      } else {
        alert("Upload hat nicht funktioniert!");
      }
    }
  };
  req.send(formData);
}

function addOrdner() {
  // Ordner hinzuzufügen
  var path = sessionStorage.getItem("path");
  let formData = new FormData();
  formData.append("type", "dir");
  var req = new XMLHttpRequest();

  req.open(
    "POST",
    "" +
      API_BASE_URL +
      "/" +
      path +
      "/" +
      document.getElementById("ordnername").value,
    true
  ); //Anfrage
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        ordnername = document.getElementById("ordnername").value;
        addOrdnerElement(ordnername);
        document.getElementById("ordnername").value = "";
      } else {
        alert("Hinzufügen des Ordners fehlgeschlagen!"); // Fehlermeldung
      }
    }
  };
  req.send(formData);
}

function getOrdner(path, fangWeitergabe) {
  // Verzeichnispfad laden
  var path = sessionStorage.getItem("path");
  let formData = new FormData();
  formData.append("type", "dir");
  var req = new XMLHttpRequest();

  req.open("GET", "" + API_BASE_URL + "/" + path, true); //
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode")); // Token anhängen
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        let response = JSON.parse(this.responseText); // Als JSON parsen
        drawOrdner(response, fangWeitergabe); // Ordner darstellen
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/";
        if (sessionStorage.getItem("path") == "") {
          document.getElementById("logout").style.cursor = "pointer";
          document.getElementById("logout").removeAttribute("disabled");
        } else {
          document.getElementById("logout").style.cursor = "not-allowed";
          document.getElementById("logout").setAttribute("disabled", "");
        }
      } else {
        alert("Ordner konnte nicht bekommen werden."); // Fehlermeldung
      }
    }
  };
  req.send(formData);
}

function getData(fangFrage1) {
  // Daten aus ROOT-Folder
  path = sessionStorage.getItem("path");
  var formdata = new FormData();
  var request = new XMLHttpRequest();
  request.open("GET", "" + API_BASE_URL + "/" + path, true); // Anfrage für Path
  request.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  request.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        if (sessionStorage.getItem("path") == "") {
          // Logout Button klickbar machen
          document.getElementById("logout").style.cursor = "pointer";
          document.getElementById("logout").removeAttribute("disabled");
        } else {
          document.getElementById("logout").style.cursor = "not-allowed";
          document.getElementById("logout").setAttribute("disabled", "");
        }
        history.pushState({ dir: "" }, "Root", "");
        getOrdner(path, fangFrage1); // Ordner vom Path laden
      } else {
        alert("Daten konnten nicht geholt werden."); // Fehlermeldung
      }
    }
  };
  request.send(formdata);
}

function getPushstateOrdner(path) {
  // getOrdner Erweiterung
  let formData = new FormData();
  formData.append("type", "dir");
  var req = new XMLHttpRequest();

  req.open("GET", "" + API_BASE_URL + "/" + path, true);
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // timer resetten
        let response = JSON.parse(this.responseText);
        document.getElementById("ordnercontent").innerText = "";
        drawOrdner(response, false); // Anzeigen
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/";
      } else {
        alert("Ordner nicht gefunden beim Navigieren"); // Fehlermeldung
      }
    }
  };
  req.send(formData);
}

var ordnercontent = document.createElement("div"); // neues Div erstellen für die Ordner
function drawOrdner(JsonObjekt, fangFrage) {
  // Ordner anzeigen

  for (let i = 0; i < JsonObjekt.length; i++) {
    ordnercontent.id = "ordnercontent";

    if (fangFrage) {
      if (document.getElementById("file").files[0].name != JsonObjekt[i].Name) {
        continue;
      }
    }

    var ordnername = JsonObjekt[i].Name;
    var type = JsonObjekt[i].Type;

    var newDiv = document.createElement("div"); // Neues Div erstellen
    ordnercontent.appendChild(newDiv);
    var img = document.createElement("img"); // Neues Image erstellen
    var br = document.createElement("BR"); // Zeilenumbruch erstellen
    img.src = showType(type); // Icon erstellen
    var newContent = document.createElement("h1"); // Überschrift Name
    newContent.classList.add("h1");
    newContent.innerHTML = ordnername;

    newDiv.appendChild(newContent);
    newDiv.appendChild(img);
    newDiv.appendChild(br);
    newDiv.id = ordnername;
    newDiv.classList.add("daten");
    newDiv.type = type;

    img.setAttribute("data-ordner", ordnername);
    img.setAttribute("data-type", type);
    img.classList.add("img");

    var deleteButton = document.createElement("button"); // Löschen Button erstellen
    deleteButton.innerHTML = "Delete " + img.getAttribute("data-ordner");
    deleteButton.classList.add("deletebutton");

    deleteButton.setAttribute("data-ordner", ordnername);
    deleteButton.setAttribute("data-type", type);

    newDiv.setAttribute("data-ordner", ordnername);
    newDiv.setAttribute("data-type", type);

    newDiv.appendChild(deleteButton); // Button dem Div hinzufügen
    document.getElementById("page").appendChild(ordnercontent);
    document.getElementById("ordnercontent").appendChild(newDiv);

    deleteButton.addEventListener("click", function () {
      // Löschen Button Event Listener
      deleteOrdner(this.getAttribute("data-ordner"));
    });

    img.addEventListener("click", function () {
      // Typ des geklickten Prüfen
      if (this.getAttribute("data-type") == "dir") {
        path = sessionStorage.getItem("path");
        sessionStorage.setItem(
          "path",
          path + "/" + this.getAttribute("data-ordner")
        );
        const state = { dir: sessionStorage.getItem("path") };
        window.history.pushState(
          state,
          sessionStorage.getItem("path"),
          sessionStorage.getItem("path")
        );
        document.getElementById("back").removeAttribute("disabled");
        document.getElementById("back").style.cursor = "pointer";
        getOrdner(path);
        for (var i = 0; i < ordnercontent.childNodes.length; i++) {
          if (ordnercontent.childNodes[i] == this.getAttribute("data-ordner")) {
            ordnercontent.childNodes[i].style.display = "inline";
          } else {
            ordnercontent.childNodes[i].style.display = "none";
          }
        }
      } else {
        // Für Dateien
        document.getElementById("back").removeAttribute("disabled");
        document.getElementById("back").style.cursor = "pointer";
        path = sessionStorage.getItem("path");
        sessionStorage.setItem(
          "path",
          path + "/" + this.getAttribute("data-ordner")
        );
        const state = { dir: sessionStorage.getItem("path") };
        window.history.pushState(
          state,
          sessionStorage.getItem("path"),
          sessionStorage.getItem("path")
        );
        if (this.getAttribute("data-type").startsWith("audio")) {
          getAudio(
            this.getAttribute("data-type"),
            this.getAttribute("data-ordner")
          );
          for (var i = 0; i < ordnercontent.childNodes.length; i++) {
            if (
              ordnercontent.childNodes[i] == this.getAttribute("data-ordner")
            ) {
              ordnercontent.childNodes[i].style.display = "inline";
            } else {
              ordnercontent.childNodes[i].style.display = "none";
            }
          }
        } else if (this.getAttribute("data-type").startsWith("image")) {
          getImage(
            this.getAttribute("data-type"),
            this.getAttribute("data-ordner")
          );
          for (var i = 0; i < ordnercontent.childNodes.length; i++) {
            if (
              ordnercontent.childNodes[i] == this.getAttribute("data-ordner")
            ) {
              ordnercontent.childNodes[i].style.display = "inline";
            } else {
              ordnercontent.childNodes[i].style.display = "none";
            }
          }
        } else if (this.getAttribute("data-type").startsWith("video")) {
          getVideo(
            this.getAttribute("data-type"),
            this.getAttribute("data-ordner")
          );
          for (var i = 0; i < ordnercontent.childNodes.length; i++) {
            if (
              ordnercontent.childNodes[i] == this.getAttribute("data-ordner")
            ) {
              ordnercontent.childNodes[i].style.display = "inline";
            } else {
              ordnercontent.childNodes[i].style.display = "none";
            }
          }
        } else if (this.getAttribute("data-type").startsWith("text")) {
          getText(
            this.getAttribute("data-type"),
            this.getAttribute("data-ordner")
          );
          for (var i = 0; i < ordnercontent.childNodes.length; i++) {
            if (
              ordnercontent.childNodes[i] == this.getAttribute("data-ordner")
            ) {
              ordnercontent.childNodes[i].style.display = "inline";
            } else {
              ordnercontent.childNodes[i].style.display = "none";
            }
          }
        } else {
          getRest(
            this.getAttribute("data-type"),
            this.getAttribute("data-ordner")
          );
          for (var i = 0; i < ordnercontent.childNodes.length; i++) {
            if (
              ordnercontent.childNodes[i] == this.getAttribute("data-ordner")
            ) {
              ordnercontent.childNodes[i].style.display = "inline";
            } else {
              ordnercontent.childNodes[i].style.display = "none";
            }
          }
        }
      }
    });
  }
  if (sessionStorage.getItem("path") == "") {
    // Logout Button
    document.getElementById("logout").style.cursor = "pointer";
    document.getElementById("logout").removeAttribute("disabled");
  } else {
    document.getElementById("logout").style.cursor = "not-allowed";
    document.getElementById("logout").setAttribute("disabled", "");
  }
}

function uploadData() {
  // Upload Funktion
  var f = document.getElementById("file").files[0];
  let reader = new FileReader();
  reader.onload = (function (theFile) {
    return function (e) {
      var binaryData = e.target.result;
      var base64String = window.btoa(binaryData); // In Base64 konvertieren

      let formData = new FormData();
      formData.append("content", base64String);

      path = sessionStorage.getItem("path");

      var req = new XMLHttpRequest();
      req.open(
        "POST",
        "" +
          API_BASE_URL +
          "/" +
          path +
          "/" +
          document.getElementById("file").files[0].name,
        true
      ); // Anfrage
      req.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
      req.onreadystatechange = function (event) {
        if (this.readyState == 4) {
          if (this.status == 200) {
            timer();
            const state = { dir: sessionStorage.getItem("path") };
            window.history.pushState(
              state,
              sessionStorage.getItem("path"),
              sessionStorage.getItem("path")
            );
            window.history.back();
          } else {
            alert("Upload hat nicht funktioniert!");
          }
        }
      };
      req.send(formData);
    };
  })(f);
  reader.readAsBinaryString(f);
}

function bearbeiteText() {
  // Text bearbeiten
  var req = new XMLHttpRequest();
  path = sessionStorage.getItem("path");
  req.open("DELETE", "" + API_BASE_URL + "" + path, true);
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        console.log("gelöscht");
        let formData = new FormData();
        formData.append(
          "content",
          btoa(document.getElementById("dtext").value)
        );

        var req1 = new XMLHttpRequest();
        req1.open("POST", "" + API_BASE_URL + "/" + path, true);
        req1.setRequestHeader(
          "Authorization",
          sessionStorage.getItem("authcode")
        );
        req1.onreadystatechange = function (event) {
          if (this.readyState == 4) {
            if (this.status == 200) {
              timer();
              window.history.go(-1);
              console.log("gespeichert");
            } else {
              alert("Upload hat nicht funktioniert!");
            }
          }
        };
        req1.send(formData);
      } else {
        alert(
          "Löschen fehlgeschlagen. Bitte überprüfen, ob im Ordner noch Dateien vorhanden sind."
        ); // Fehlermeldung
      }
    }
  };
  req.send();
}

function deleteOrdner(ordnername) {
  // Löschen
  var req = new XMLHttpRequest();
  path = sessionStorage.getItem("path");
  req.open("DELETE", "" + API_BASE_URL + "" + path + "/" + ordnername, true);
  req.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  req.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        document.getElementById(ordnername).style.display = "none"; // Element nicht mehr anzeigen
      } else {
        alert(
          "Löschen fehlgeschlagen. Bitte überprüfen, ob im Ordner noch Dateien vorhanden sind."
        ); // Fehlermeldung
      }
    }
  };
  req.send();
}

function getRest(datatype, dataname) {
  //Funktion um Rest herunterzuladen
  document.getElementById("upload").style.cursor = "not-allowed";
  document.getElementById("upload").setAttribute("disabled", "");
  document.getElementById("add").style.cursor = "not-allowed";
  document.getElementById("add").setAttribute("disabled", "");
  document.getElementById("logout").style.cursor = "not-allowed";
  document.getElementById("logout").setAttribute("disabled", "");

  var formdata = new FormData();
  formdata.append("type", datatype);
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "" + API_BASE_URL + "/" + path + "/" + dataname + "?format=base64",
    true
  );
  request.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  request.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/" + dataname;

        var dataurl = "data:" + datatype + ";base64," + this.responseText;
        var pre1 = document.createElement("pre");
        var pre2 = document.createElement("pre");
        var br = document.createElement("BR");
        var downloadButton = document.createElement("a");
        pre1.id = "filecontent";
        pre2.id = "filecontent";

        pre1.innerText = "Diese Datei ist nicht sinnvoll darstellbar.";
        pre2.innerText =
          "Da es sich um einen " + datatype + " Datentyp handelt.";

        var grafik = document.createElement("Button");
        grafik.innerHTML = "Download";
        grafik.setAttribute("type", "button");

        downloadButton.classList.add("downloadbutton");
        downloadButton.setAttribute("id", "down");
        downloadButton.setAttribute("download", dataname);
        downloadButton.setAttribute("href", dataurl);

        downloadButton.appendChild(grafik);
        ordnercontent.appendChild(pre1);
        pre1.appendChild(br);
        ordnercontent.appendChild(pre2);
        ordnercontent.appendChild(br);
        ordnercontent.appendChild(downloadButton);
      } else {
        alert("Datei kann nicht angezeigt werden!");
      }
    }
  };
  request.send();
}

function getImage(datatype, dataname) {
  // Bild Element
  document.getElementById("upload").style.cursor = "not-allowed";
  document.getElementById("upload").setAttribute("disabled", "");
  document.getElementById("add").style.cursor = "not-allowed";
  document.getElementById("add").setAttribute("disabled", "");
  document.getElementById("logout").style.cursor = "not-allowed";
  document.getElementById("logout").setAttribute("disabled", "");

  var formdata = new FormData();
  formdata.append("type", "image");
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "" + API_BASE_URL + "/" + path + "/" + dataname + "?format=base64",
    true
  ); // Anfrage Base64 Format
  request.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  request.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer(); // Timer zurücksetzen
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/" + dataname;
        var image = document.createElement("img");
        var br = document.createElement("BR");
        var dataurl = "data:" + datatype + ";base64," + this.responseText;
        var downloadButton = document.createElement("a");

        image.id = "image";
        image.src = dataurl;

        image.setAttribute("width", "70%");

        downloadButton.classList.add("downloadbutton");
        downloadButton.setAttribute("download", dataname);
        downloadButton.setAttribute("href", dataurl);

        var grafik = document.createElement("Button");
        grafik.innerHTML = "Download";
        grafik.setAttribute("type", "button");

        ordnercontent.appendChild(image);
        ordnercontent.appendChild(br);
        downloadButton.appendChild(grafik);
        ordnercontent.appendChild(downloadButton);
      } else {
        alert("Datei kann nicht angezeigt werden!");
      }
    }
  };
  request.send();
}

function getAudio(datatype, dataname) {
  // Audio Element
  document.getElementById("upload").style.cursor = "not-allowed";
  document.getElementById("upload").setAttribute("disabled", "");
  document.getElementById("add").style.cursor = "not-allowed";
  document.getElementById("add").setAttribute("disabled", "");
  document.getElementById("logout").style.cursor = "not-allowed";
  document.getElementById("logout").setAttribute("disabled", "");

  var formdata = new FormData();
  formdata.append("type", "audio");
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "" + API_BASE_URL + "/" + path + "/" + dataname + "?format=base64",
    true
  );
  request.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  request.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer();
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/" + dataname;
        var audio = document.createElement("audio");
        var br = document.createElement("BR");
        audio.id = "audio";
        var source = document.createElement("source");
        var dataurl = "data:" + datatype + ";base64," + this.responseText;
        source.src = dataurl;
        audio.setAttribute("controls", "");
        source.type = datatype;
        audio.appendChild(source);
        document.getElementById("ordnercontent").appendChild(audio);
        ordnercontent.appendChild(br);

        var downloadButton = document.createElement("a");

        downloadButton.classList.add("downloadbutton");
        downloadButton.setAttribute("download", dataname);
        downloadButton.setAttribute("href", dataurl);

        var grafik = document.createElement("Button");
        grafik.innerHTML = "Download";
        grafik.setAttribute("type", "button");

        downloadButton.appendChild(grafik);
        ordnercontent.appendChild(downloadButton);
      } else {
        alert("Datei kann nicht angezeigt werden!");
      }
    }
  };
  request.send();
}

function getText(datatype, dataname) {
  // Text Element
  document.getElementById("upload").style.cursor = "not-allowed";
  document.getElementById("upload").setAttribute("disabled", "");
  document.getElementById("add").style.cursor = "not-allowed";
  document.getElementById("add").setAttribute("disabled", "");
  document.getElementById("logout").style.cursor = "not-allowed";
  document.getElementById("logout").setAttribute("disabled", "");

  var formdata = new FormData();
  formdata.append("type", "text");
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "" + API_BASE_URL + "/" + path + "/" + dataname + "?format=base64",
    true
  );
  request.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  request.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer();
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/" + dataname;
        var dataurl = "data:" + datatype + ";base64," + this.responseText;
        var pre = document.createElement("pre");
        var br = document.createElement("BR");
        var downloadButton = document.createElement("a");
        var bearbeitenButton = document.createElement("Button");
        pre.id = "filecontent";

        pre.innerText = atob(this.responseText);

        var grafik = document.createElement("Button");
        grafik.innerHTML = "Download";
        grafik.setAttribute("type", "button");

        downloadButton.classList.add("downloadbutton");
        downloadButton.setAttribute("id", "down");
        downloadButton.setAttribute("download", dataname);
        downloadButton.setAttribute("href", dataurl);

        bearbeitenButton.innerHTML = "Bearbeiten";
        bearbeitenButton.classList.add("bearbeitenbutton");
        bearbeitenButton.setAttribute("type", "submit");
        bearbeitenButton.setAttribute("id", "bearbeit");
        bearbeitenButton.setAttribute(
          "onclick",
          "document.getElementById('bearbeitenDialog').show(); document.getElementById('bearbeit').style.display = 'none'; document.getElementById('down').style.display = 'none'; document.getElementById('back').style.cursor = 'not-allowed'; document.getElementById('back').setAttribute('disabled', '');"
        );
        bearbeitenButton.setAttribute("href", dataurl);

        downloadButton.appendChild(grafik);
        ordnercontent.appendChild(pre);
        ordnercontent.appendChild(br);
        ordnercontent.appendChild(downloadButton);
        ordnercontent.appendChild(bearbeitenButton);

        document.getElementById("dtext").value = atob(this.responseText);
      } else {
        alert("Datei kann nicht angezeigt werden!");
      }
    }
  };
  request.send();
}

function getVideo(datatype, dataname) {
  // Video Element
  document.getElementById("upload").style.cursor = "not-allowed";
  document.getElementById("upload").setAttribute("disabled", "");
  document.getElementById("add").style.cursor = "not-allowed";
  document.getElementById("add").setAttribute("disabled", "");
  document.getElementById("logout").style.cursor = "not-allowed";
  document.getElementById("logout").setAttribute("disabled", "");

  var formdata = new FormData();
  formdata.append("type", "video");
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "" + API_BASE_URL + "/" + path + "/" + dataname + "?format=base64",
    true
  );
  request.setRequestHeader("Authorization", sessionStorage.getItem("authcode"));
  request.onreadystatechange = function (event) {
    if (this.readyState == 4) {
      if (this.status == 200) {
        timer();
        document.getElementById("verzeichnis").innerText =
          "Data Path: " + path + "/" + dataname;
        var video = document.createElement("video");
        var br = document.createElement("BR");
        video.id = "video";
        var source = document.createElement("source");
        var dataurl = "data:" + datatype + ";base64," + this.responseText;
        video.setAttribute("controls", "");
        video.setAttribute("width", "70%");
        source.src = dataurl;
        source.type = datatype;
        video.appendChild(source);
        ordnercontent.appendChild(video);
        ordnercontent.appendChild(br);

        var downloadButton = document.createElement("a");

        downloadButton.classList.add("downloadbutton");
        downloadButton.setAttribute("download", dataname);
        downloadButton.setAttribute("href", dataurl);

        var grafik = document.createElement("Button");
        grafik.innerHTML = "Download";
        grafik.setAttribute("type", "button");

        downloadButton.appendChild(grafik);

        ordnercontent.appendChild(downloadButton);
      } else {
        alert("Datei kann nicht angezeigt werden!");
      }
    }
  };
  request.send();
}

function addOrdnerElement(ordnername) {
  // Ordner hinzuzufügen
  var type = "dir";
  var newDiv = document.createElement("div");
  var newContent = document.createTextNode(ordnername);
  var newDiv = document.createElement("div");
  var img = document.createElement("img");
  var br = document.createElement("BR");
  img.src = "/webengineering/assets/ordner.png";
  var newContent = document.createElement("h1");
  newContent.innerHTML = ordnername;
  newContent.classList.add("h1");
  newDiv.appendChild(newContent);
  newDiv.appendChild(img);
  newDiv.appendChild(br);
  newDiv.id = ordnername;
  img.setAttribute("data-ordner", ordnername);
  img.setAttribute("data-type", type);
  newDiv.classList.add("daten");
  img.classList.add("img");

  var deleteButton = document.createElement("button");
  deleteButton.innerHTML = "delete " + img.getAttribute("data-ordner");
  deleteButton.classList.add("deletebutton");
  newDiv.appendChild(deleteButton);
  deleteButton.addEventListener("click", function () {
    // Löschen Event Listener
    deleteOrdner(ordnername);
  });
  img.addEventListener("click", function () {
    path = sessionStorage.getItem("path");
    sessionStorage.setItem(
      "path",
      path + "/" + this.getAttribute("data-ordner")
    );
    const state = { dir: sessionStorage.getItem("path") };
    window.history.pushState(
      state,
      sessionStorage.getItem("path"),
      sessionStorage.getItem("path")
    );
    document.getElementById("verzeichnis").innerText =
      "Data Path: " + sessionStorage.getItem("path") + "/";

    document.getElementById("back").removeAttribute("disabled");
    document.getElementById("back").style.cursor = "pointer";

    document.getElementById("logout").style.cursor = "not-allowed";
    document.getElementById("logout").setAttribute("disabled", "");

    for (var i = 0; i < ordnercontent.childNodes.length; i++) {
      // Erstellten Ordner anzeigen
      if (ordnercontent.childNodes[i] == this.getAttribute("data-ordner")) {
        ordnercontent.childNodes[i].style.display = "inline";
      } else {
        ordnercontent.childNodes[i].style.display = "none";
      }
    }
  });
  document.getElementById("ordnercontent").appendChild(newDiv);
}

window.addEventListener("popstate", (event) => {
  // Navigieren mit den Browserpfeilen
  document.getElementById("upload").style.cursor = "pointer";
  document.getElementById("upload").removeAttribute("disabled");
  document.getElementById("add").style.cursor = "pointer";
  document.getElementById("add").removeAttribute("disabled");

  let ordner = event.state.dir;
  sessionStorage.setItem("aktuellerordner", ordner);
  getPushstateOrdner(ordner);
  sessionStorage.setItem("path", ordner);

  if (sessionStorage.getItem("path") == "") {
    // Logout und Zurückbutton überprüfen
    document.getElementById("logout").disabled = "false";
    document.getElementById("logout").style.cursor = "pointer";

    document.getElementById("back").style.cursor = "not-allowed";
    document.getElementById("back").setAttribute("disabled", "");
  }
});
