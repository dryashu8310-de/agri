/* =================================
   MOBILE MENU
================================= */

function toggleMenu() {

    const nav = document.querySelector(".nav-links");

    if (nav) {
        nav.classList.toggle("show");
    }
}


/* =================================
   CLOSE MOBILE MENU
================================= */

document.addEventListener("click", function(event) {

    const nav = document.querySelector(".nav-links");
    const menuButton = document.querySelector(".menu-btn");

    if (!nav || !menuButton) {
        return;
    }

    if (
        !nav.contains(event.target) &&
        !menuButton.contains(event.target)
    ) {
        nav.classList.remove("show");
    }

});


/* =================================
   ACTIVE NAVIGATION
================================= */

document.addEventListener("DOMContentLoaded", function() {

    const currentPage =
        window.location.pathname.split("/").pop();

    const links =
        document.querySelectorAll(".nav-links a");

    links.forEach(function(link) {

        const linkPage =
            link.getAttribute("href");

        if (
            linkPage === currentPage ||
            (currentPage === "" && linkPage === "index.html")
        ) {
            link.classList.add("active");
        }

    });

});


/* =================================
   SIMPLE FORM MESSAGE
================================= */

function showMessage(message) {

    alert(message);

}