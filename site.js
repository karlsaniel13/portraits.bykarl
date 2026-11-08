/* site.js - accounts + footer comments for portraits.bykarl */
(function () {
    "use strict";

    var USERS_KEY = "pb_users";
    var SESSION_KEY = "pb_session";
    var COMMENTS_KEY = "pb_comments";
    var RETURN_KEY = "pb_return";
    var MAX_COMMENT_LENGTH = 500;
    var MAX_STORED_COMMENTS = 500;

    /* ---------- sample comments shown in the footer (edit text, names, dates, or pictures here) ---------- */
    var SEED_COMMENTS = [
        {
            id: "seed1",
            seed: true,
            username: "Jiro Danganan",
            avatar: "jiro.jpg",
            text: "Amazing website :), Tara chess",
            ts: Date.UTC(2026, 10, 5, 9, 30)
        },
        {
            id: "seed2",
            seed: true,
            username: "Kian Bathan",
            avatar: "kian.jpg",
            text: "kung hindi tayo para sa isa't isa. Pwede paisa?",
            ts: Date.UTC(2026, 10, 3, 14, 10)
        },
        {
            id: "seed3",
            seed: true,
            username: "Jancel Buama",
            avatar: "jancel.jpg",
            text: "kulang ng royaL",
            ts: Date.UTC(2026, 9, 31, 11, 45)
        },
        {
            id: "seed4",
            seed: true,
            username: "Karl Saniel",
            avatar: "karls.jpg",
            text: "Aanhin mo ang maraming pera kung yung face card ng teacher mo sa UTS bawing bawi na",
            ts: Date.UTC(2026, 9, 28, 16, 20)
        },
        {
            id: "seed5",
            seed: true,
            username: "Reuben Flavier",
            avatar: "reuben.jpg",
            text: " Smokey Sarap",
            ts: Date.UTC(2026, 9, 22, 8, 5)
        },
        {
            id: "seed6",
            seed: true,
            username: "Genesis Jimenez",
            avatar: "genesis.jpg",
            text: "placeholder.",
            ts: Date.UTC(2026, 9, 15, 13, 40)
        },
        {
            id: "seed7",
            seed: true,
            username: "Francis Angcana",
            avatar: "francis.jpg",
            text: "Sipsip Sarap",
            ts: Date.UTC(2026, 9, 7, 10, 0)
        }
    ];

    /* ---------- storage helpers ---------- */
    function read(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    function fail(message) {
        return { ok: false, error: message };
    }

    /* ---------- password hashing ---------- */
    function toHex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
            return ("0" + b.toString(16)).slice(-2);
        }).join("");
    }

    function randomSalt() {
        var bytes = new Uint8Array(16);
        if (window.crypto && crypto.getRandomValues) {
            crypto.getRandomValues(bytes);
        } else {
            for (var i = 0; i < bytes.length; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }
        return toHex(bytes);
    }

    function hashPassword(password, salt) {
        var text = salt + ":" + password;

        if (window.crypto && crypto.subtle) {
            return crypto.subtle
                .digest("SHA-256", new TextEncoder().encode(text))
                .then(toHex);
        }

        var h = 5381;
        for (var i = 0; i < text.length; i++) {
            h = (((h << 5) + h) + text.charCodeAt(i)) | 0;
        }
        return Promise.resolve("f" + (h >>> 0).toString(16));
    }

    /* ---------- accounts ---------- */
    function getUsers() {
        var users = read(USERS_KEY, []);
        return Array.isArray(users) ? users : [];
    }

    function findByUsername(name) {
        var lower = String(name).toLowerCase();
        return getUsers().find(function (u) {
            return u.username.toLowerCase() === lower;
        }) || null;
    }

    function currentUser() {
        var name = read(SESSION_KEY, null);
        if (!name) return null;
        var user = findByUsername(name);
        return user ? { username: user.username, email: user.email } : null;
    }

    function register(username, email, password, confirm) {
        username = String(username || "").trim();
        email = String(email || "").trim();
        password = String(password || "");

        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            return Promise.resolve(fail("Username must be 3-20 characters: letters, numbers, or underscores."));
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            return Promise.resolve(fail("Please enter a valid email address."));
        }
        if (password.length < 6) {
            return Promise.resolve(fail("Password must be at least 6 characters."));
        }
        if (password !== confirm) {
            return Promise.resolve(fail("Passwords do not match."));
        }

        var users = getUsers();

        if (findByUsername(username)) {
            return Promise.resolve(fail("That username is already taken."));
        }
        if (users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
            return Promise.resolve(fail("That email is already registered."));
        }

        var salt = randomSalt();

        return hashPassword(password, salt).then(function (hash) {
            users.push({
                username: username,
                email: email,
                salt: salt,
                hash: hash,
                createdAt: Date.now()
            });

            if (!write(USERS_KEY, users)) {
                return fail("Could not save your account. Please allow site storage in your browser.");
            }

            write(SESSION_KEY, username);
            return { ok: true };
        });
    }

    function login(identifier, password) {
        var id = String(identifier || "").trim().toLowerCase();
        var bad = fail("Incorrect username/email or password.");

        var user = getUsers().find(function (u) {
            return u.username.toLowerCase() === id || u.email.toLowerCase() === id;
        });

        if (!user) return Promise.resolve(bad);

        return hashPassword(String(password || ""), user.salt).then(function (hash) {
            if (hash !== user.hash) return bad;
            write(SESSION_KEY, user.username);
            return { ok: true };
        });
    }

    function logout() {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (e) { /* ignore */ }
    }

    /* ---------- return to the page the visitor came from ---------- */
    function currentFile() {
        return location.pathname.split("/").pop() || "index.html";
    }

    function rememberPage() {
        try {
            sessionStorage.setItem(RETURN_KEY, currentFile());
        } catch (e) { /* ignore */ }
    }

    function goBack() {
        var target = "index.html";
        try {
            var saved = sessionStorage.getItem(RETURN_KEY);
            if (saved && /^[\w-]+\.html$/.test(saved)) target = saved;
            sessionStorage.removeItem(RETURN_KEY);
        } catch (e) { /* ignore */ }
        location.href = target;
    }

    function redirectIfLoggedIn() {
        if (currentUser()) location.replace("index.html");
    }

    /* ---------- comments ---------- */
    function getComments() {
        var list = read(COMMENTS_KEY, []);
        return Array.isArray(list) ? list : [];
    }

    function addComment(text) {
        var user = currentUser();
        if (!user) return fail("Please log in to comment.");

        text = String(text || "").trim();
        if (!text) return fail("Write something before posting.");
        if (text.length > MAX_COMMENT_LENGTH) {
            return fail("Comments can be up to " + MAX_COMMENT_LENGTH + " characters.");
        }

        var list = getComments();
        list.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            username: user.username,
            text: text,
            ts: Date.now()
        });

        if (list.length > MAX_STORED_COMMENTS) {
            list = list.slice(-MAX_STORED_COMMENTS);
        }

        return write(COMMENTS_KEY, list) ? { ok: true } : fail("Could not save your comment.");
    }

    function deleteComment(id) {
        var user = currentUser();
        if (!user) return;

        var list = getComments().filter(function (c) {
            return !(c.id === id && c.username === user.username);
        });
        write(COMMENTS_KEY, list);
    }

    function timeAgo(ts) {
        var seconds = Math.floor((Date.now() - ts) / 1000);
        if (seconds < 45) return "just now";

        var minutes = Math.round(seconds / 60);
        if (minutes < 60) return minutes + " min ago";

        var hours = Math.round(minutes / 60);
        if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");

        var days = Math.round(hours / 24);
        if (days < 7) return days + (days === 1 ? " day ago" : " days ago");

        return new Date(ts).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    /* ---------- DOM helper ---------- */
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    /* round profile picture: shows the first letter until the image file exists */
    function avatar(name, src) {
        var wrap = el("div", "pb-avatar");
        wrap.appendChild(el("span", "pb-avatar-initial", String(name).charAt(0)));

        if (src) {
            var img = document.createElement("img");
            img.alt = "";
            img.addEventListener("error", function () {
                if (img.parentNode) img.parentNode.removeChild(img);
            });
            img.src = src;
            wrap.appendChild(img);
        }

        return wrap;
    }

    /* ---------- styles for the injected UI ---------- */
    var CSS = [
        ".pb-comments{margin-bottom:25px;padding-top:25px;border-top:1px solid #33261e}",
        ".pb-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 18px;background:transparent;border:1px solid #4a3a30;color:#e3d7c4;font-family:inherit;font-size:13px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;transition:background-color .3s,border-color .3s,color .3s}",
        ".pb-toggle:hover,.pb-toggle[aria-expanded='true']{border-color:#c8a47e;color:#c8a47e}",
        ".pb-chevron{transition:transform .3s}",
        ".pb-toggle[aria-expanded='true'] .pb-chevron{transform:rotate(180deg)}",
        ".pb-panel{margin-top:20px}",
        ".pb-panel[hidden]{display:none}",
        ".pb-gate,.pb-composer{padding:20px;background:rgba(255,255,255,.03);border:1px solid #33261e;border-top:2px solid #6f4e37}",
        ".pb-gate p{margin:0 0 14px;font-size:14px;line-height:1.7;color:#bfae98}",
        ".pb-gate a{display:inline-block;margin:0 8px 8px 0;padding:11px 20px;font-size:13px;font-weight:bold;text-decoration:none;transition:background-color .3s,border-color .3s,color .3s}",
        ".pb-gate .pb-login{border:1px solid #4a3a30;color:#e3d7c4}",
        ".pb-gate .pb-login:hover{border-color:#c8a47e;color:#c8a47e}",
        ".pb-gate .pb-signup{border:1px solid #c8a47e;background:#c8a47e;color:#120d0b}",
        ".pb-gate .pb-signup:hover{background:#e3d7c4;border-color:#e3d7c4}",
        ".pb-who{margin-bottom:10px;font-size:13px;color:#bfae98}",
        ".pb-who strong{font-family:Georgia,serif;font-size:16px;font-weight:normal;color:#c8a47e}",
        ".pb-composer textarea{display:block;width:100%;min-height:90px;padding:12px;background:#120d0b;border:1px solid #4a3a30;color:#efe4d2;font-family:inherit;font-size:14px;line-height:1.6;resize:vertical}",
        ".pb-composer textarea:focus{outline:none;border-color:#c8a47e}",
        ".pb-composer-bar{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:12px}",
        ".pb-counter{font-size:12px;color:#8e7b68}",
        ".pb-post{padding:12px 22px;background:#c8a47e;border:none;color:#120d0b;font-family:inherit;font-size:13px;font-weight:bold;cursor:pointer;transition:background-color .3s}",
        ".pb-post:hover{background:#e3d7c4}",
        ".pb-error{min-height:18px;margin-top:10px;font-size:13px;color:#e59a86}",
        ".pb-list{list-style:none;display:flex;flex-direction:column;gap:12px;margin-top:20px}",
        ".pb-item{display:flex;align-items:flex-start;gap:14px;padding:16px;background:rgba(255,255,255,.03);border:1px solid #33261e;border-left:2px solid #6f4e37}",
        ".pb-item-main{flex:1;min-width:0}",
        ".pb-avatar{position:relative;flex-shrink:0;width:42px;height:42px;border-radius:50%;overflow:hidden;background:#6f4e37;border:2px solid #c8a47e}",
        ".pb-avatar-initial{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:18px;color:#efe4d2;text-transform:uppercase}",
        ".pb-avatar img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}",
        ".pb-item-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}",
        ".pb-user{font-family:Georgia,serif;font-size:16px;color:#c8a47e}",
        ".pb-time{margin-left:10px;font-size:11px;color:#8e7b68}",
        ".pb-text{font-size:14px;line-height:1.7;color:#e3d7c4;white-space:pre-wrap;overflow-wrap:anywhere}",
        ".pb-delete{background:none;border:none;color:#8e7b68;font-family:inherit;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:color .3s}",
        ".pb-delete:hover{color:#e59a86}",
        ".pb-empty{padding:20px;text-align:center;font-size:14px;color:#8e7b68}",
        "button.auth-btn{font-family:inherit;cursor:pointer}",
        ".auth-user{margin-bottom:4px;font-size:13px;line-height:1.5;text-align:center;color:var(--drawer-text);word-break:break-word}",
        ".auth-user strong{display:block;font-family:Georgia,serif;font-size:20px;font-weight:normal;color:#c8a47e}"
    ].join("\n");

    function injectStyles() {
        var style = document.createElement("style");
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    /* ---------- footer comments section ---------- */
    function buildComments() {
        var footer = document.querySelector("footer");
        if (!footer || document.body.hasAttribute("data-no-comments")) return;

        var user = currentUser();

        var section = el("section", "pb-comments");
        section.setAttribute("aria-label", "Comments");

        /* collapsed by default: only this bar is visible */
        var toggle = el("button", "pb-toggle");
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "pbPanel");

        var toggleLabel = el("span", "", "Comments (0)");
        var chevron = el("span", "pb-chevron", "\u25BE");
        chevron.setAttribute("aria-hidden", "true");
        toggle.appendChild(toggleLabel);
        toggle.appendChild(chevron);

        var panel = el("div", "pb-panel");
        panel.id = "pbPanel";
        panel.hidden = true;

        var list = el("ul", "pb-list");

        function renderList() {
            /* visitor comments + the built-in sample comments, newest first */
            var comments = getComments().concat(SEED_COMMENTS).sort(function (a, b) {
                return b.ts - a.ts;
            });

            toggleLabel.textContent = "Comments (" + comments.length + ")";
            list.textContent = "";

            if (!comments.length) {
                list.appendChild(el("li", "pb-empty", "No comments yet. Be the first to share your thoughts."));
                return;
            }

            var me = currentUser();

            comments.forEach(function (c) {
                var item = el("li", "pb-item");

                /* profile picture before the username */
                item.appendChild(avatar(c.username, c.avatar));

                var main = el("div", "pb-item-main");
                var head = el("div", "pb-item-head");
                var who = el("div");

                who.appendChild(el("span", "pb-user", c.username));

                var time = el("span", "pb-time", timeAgo(c.ts));
                time.title = new Date(c.ts).toLocaleString();
                who.appendChild(time);
                head.appendChild(who);

                if (!c.seed && me && me.username === c.username) {
                    var del = el("button", "pb-delete", "Delete");
                    del.type = "button";
                    del.addEventListener("click", function () {
                        if (window.confirm("Delete this comment?")) {
                            deleteComment(c.id);
                            renderList();
                        }
                    });
                    head.appendChild(del);
                }

                main.appendChild(head);
                main.appendChild(el("div", "pb-text", c.text));
                item.appendChild(main);
                list.appendChild(item);
            });
        }

        if (user) {
            var composer = el("div", "pb-composer");

            var who = el("div", "pb-who");
            who.appendChild(document.createTextNode("Commenting as "));
            who.appendChild(el("strong", "", user.username));

            var area = document.createElement("textarea");
            area.maxLength = MAX_COMMENT_LENGTH;
            area.placeholder = "Share your thoughts...";
            area.setAttribute("aria-label", "Write a comment");

            var bar = el("div", "pb-composer-bar");
            var counter = el("span", "pb-counter", "0 / " + MAX_COMMENT_LENGTH);
            var post = el("button", "pb-post", "Post Comment");
            post.type = "button";
            bar.appendChild(counter);
            bar.appendChild(post);

            var error = el("div", "pb-error");
            error.setAttribute("role", "alert");

            var submit = function () {
                var result = addComment(area.value);
                if (!result.ok) {
                    error.textContent = result.error;
                    return;
                }
                error.textContent = "";
                area.value = "";
                counter.textContent = "0 / " + MAX_COMMENT_LENGTH;
                renderList();
            };

            area.addEventListener("input", function () {
                counter.textContent = area.value.length + " / " + MAX_COMMENT_LENGTH;
            });
            area.addEventListener("keydown", function (e) {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            });
            post.addEventListener("click", submit);

            composer.appendChild(who);
            composer.appendChild(area);
            composer.appendChild(bar);
            composer.appendChild(error);
            panel.appendChild(composer);
        } else {
            var gate = el("div", "pb-gate");
            gate.appendChild(el("p", "", "Log in or sign up to leave a comment. You can still read what others have written."));

            var loginLink = el("a", "pb-login", "Log In");
            loginLink.href = "login.html";
            var signupLink = el("a", "pb-signup", "Sign Up");
            signupLink.href = "signup.html";

            gate.appendChild(loginLink);
            gate.appendChild(signupLink);
            panel.appendChild(gate);
        }

        panel.appendChild(list);

        toggle.addEventListener("click", function () {
            var open = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", open ? "false" : "true");
            panel.hidden = open;
        });

        section.appendChild(toggle);
        section.appendChild(panel);

        footer.insertBefore(section, footer.querySelector(".copyright"));

        renderList();

        /* new comments from another tab appear automatically; times refresh every minute */
        window.addEventListener("storage", function (e) {
            if (e.key === COMMENTS_KEY) renderList();
        });
        setInterval(renderList, 60000);
    }

    /* ---------- settings drawer: show the signed-in user ---------- */
    function updateDrawer() {
        var holder = document.querySelector(".auth-buttons");
        var user = currentUser();
        if (!holder || !user) return;

        holder.textContent = "";

        var info = el("div", "auth-user", "Signed in as ");
        info.appendChild(el("strong", "", user.username));

        var out = el("button", "auth-btn auth-btn-login", "Log Out");
        out.type = "button";
        out.addEventListener("click", function () {
            logout();
            location.reload();
        });

        holder.appendChild(info);
        holder.appendChild(out);
    }

    function hookAuthLinks() {
        var file = currentFile();
        if (file === "login.html" || file === "signup.html") return;

        document.querySelectorAll('a[href="login.html"], a[href="signup.html"]').forEach(function (a) {
            a.addEventListener("click", rememberPage);
        });
    }

    function init() {
        injectStyles();
        buildComments();
        updateDrawer();
        hookAuthLinks();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.PB = {
        register: register,
        login: login,
        logout: logout,
        currentUser: currentUser,
        goBack: goBack,
        redirectIfLoggedIn: redirectIfLoggedIn
    };
})();