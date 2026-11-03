//login.js
//handles login, singup, logout and sending the user to lobby

const loginUrlBase = "/api/auth/login";
let userId = "";
let firstName ="";
let lastName = "";

async function doLogin(){
    let loginInput = document.getElementById("username");
    let passwordInput = document.getElementById("password");
    let login = loginInput ? loginInput.value.trim() : "";
    let password = passwordInput ? passwordInput.value.trim() : "";
    let remember = document.getElementById("remember")
    let errorMessage = document.getElementById("login-error").innerHTML = "";
    errorMessage.hidden = true;
    errorMessage.textContent = "";

    let jsonPayload = JSON.stringify({
        login: login,
        password: password
    });
    let xhr = new XMLHttpRequest();
    xhr.open("POST", 'api/auth/login', true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    xhr.onreadystatechange = function() {
        if(xhr.readyState === 4) {
            if(xhr.status === 200){
                let jsonObject;
                try {
                    jsonObject = JSON.parse(xhr.responseText);
                } catch {
                    showLoginError(null, "Invalid server response.")
                    return;
                }

                if(!jsonObject.token || !jsobObject.user?._id){
                    showLoginError(null, "Invalid login response.");
                    return;
                }

                
                userId = jsonObject.user._id;
                firstName = jsonObject.firstName;
                lastName = jsonObject.lastName;
                sessionStorage.setItem("userId", userId);
                sessionStorage.setItem("authToken", jsonObject.token);

                saveCookie();
                window.location.href = "/host";
            } else {
                showLoginError(xhr);
            }
        }
    };
    xhr.onerror = function () {
        showLoginError(null, "Could not connect to server");
    };
        xhr.send(jsonPayload);
}


async function showLoginError(xhr){
    const errorDisplay = document.getElementById('login-error');
    let message = 'Login failed';

    if(xhr.status === 401) {
        message = 'User and password do not match.'
    } else if (xhr === 0){
        message = 'Could not reach server.'
    } else {
        try {
            message = JSON.parse(xhr.responseText).error || message;
        } catch {

        }
    }
}

async function startLogin() {
  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');

  for (const type of ['input', 'submit']) {
    form.addEventListener(type, () => {
      error.hidden = true;
    });
  }
}

async function saveCookie(){
    const remember = document.getElementById("remember")?.checked ?? false;
    let date = new Date();
    expires = remember ? ";expires=" + date.toGMTString() : "";
    document.cookie = "firstName=" + encodedURIComponent(firstName) +
    expires +
    ";path=/";
    document.cookie = "lastName=" + encodedURIComponent(firstName) +
    expires +
    ";path=/";
}

function readCookie() {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const [key, ...value] = cookie.trim().split("=");
        const decoded = decodeURIComponent(value.join("="));

        if (key === "firstName") {
            firstName = decoded;
        } else if (key === "lastName") {
            lastName = decoded;
        }
    }
    userId = sessionStorage.getItem("userId") || "";

    return {
        userId,
        firstName,
        lastName
    };
}


function doLogout() {
    userId = "";
    firstName = "";
    lastName = "";

    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userId");

    document.cookie =
        "firstName=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";

    document.cookie =
        "lastName=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";

    window.location.replace("index.html");
}

function signedIn() {
    return sessionStorage.getItem("authToken") !== null;
}
