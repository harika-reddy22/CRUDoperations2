
/*
  HARIKA SCHOLARSPACE
  Homepage functionality
*/

// LOAD DASHBOARD STATISTICS

async function loadDashboard() {
    const totalElement = document.getElementById("totalStudents");
    const classesElement = document.getElementById("totalClasses");
    const averageElement = document.getElementById("averageMarks");

    if (!totalElement) return;

    try {
        const response = await fetch("/std");

        if (!response.ok) {
            throw new Error("Unable to load students");
        }

        const students = await response.json();

        totalElement.textContent = students.length;

        const classes = new Set(
            students.map(student => String(student.class))
        );

        classesElement.textContent = classes.size;

        const validMarks = students
            .map(student => Number(student.total))
            .filter(mark => Number.isFinite(mark));

        const totalMarks = validMarks.reduce(
            (sum, mark) => sum + mark, 0
        );

        const average = validMarks.length
            ? totalMarks / validMarks.length
            : 0;

        averageElement.textContent = average.toFixed(1);

    } catch (error) {
        console.error(error);

        totalElement.textContent = "N/A";
        classesElement.textContent = "N/A";
        averageElement.textContent = "N/A";
    }
}

// LIVE STUDENT SEARCH

function initializeSearch() {
    const input = document.getElementById("studentSearch");
    const suggestions = document.getElementById("searchSuggestions");

    if (!input || !suggestions) return;

    let searchTimer;
    let requestController;

    function hideSuggestions() {
        suggestions.hidden = true;
        input.setAttribute("aria-expanded", "false");
    }

    function showSuggestions() {
        suggestions.hidden = false;
        input.setAttribute("aria-expanded", "true");
    }

    input.addEventListener("input", () => {
        clearTimeout(searchTimer);

        if (requestController) {
            requestController.abort();
        }

        const query = input.value.trim();

        suggestions.replaceChildren();

        if (!query) {
            hideSuggestions();
            return;
        }

        searchTimer = setTimeout(async () => {
            requestController = new AbortController();
            const controller = requestController;

            try {
                const response = await fetch(
                    "/std?search=" + encodeURIComponent(query),
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Search failed");
                }

                const students = await response.json();

                // Ignore results for an older search
                if (input.value.trim() !== query) return;

                suggestions.replaceChildren();

                if (students.length === 0) {
                    const message = document.createElement("div");
                    message.className = "search-message";
                    message.textContent = "No matching students found.";
                    suggestions.appendChild(message);
                } else {
                    students.slice(0, 8).forEach(student => {
                        const item = document.createElement("button");
                        item.type = "button";
                        item.className = "suggestion-item";
                        item.setAttribute("role", "option");

                        const name = document.createElement("strong");
                        name.textContent = student.student_name;

                        const id = document.createElement("small");
                        id.textContent = "ID: " + student.student_id;

                        item.append(name, id);

                        item.addEventListener("click", () => {
                            window.location.href =
                                "listOne.html?sno=" +
                                encodeURIComponent(student.student_id);
                        });

                        suggestions.appendChild(item);
                    });
                }

                showSuggestions();

            } catch (error) {
                if (error.name === "AbortError") return;

                console.error(error);

                if (input.value.trim() !== query) return;

                suggestions.replaceChildren();

                const message = document.createElement("div");
                message.className = "search-message";
                message.textContent = "Unable to search right now.";

                suggestions.appendChild(message);
                showSuggestions();
            }
        }, 250);
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideSuggestions();
        }

        if (event.key === "Enter") {
            const first = suggestions.querySelector(".suggestion-item");

            if (first && !suggestions.hidden) {
                first.click();
            }
        }
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".search-wrapper")) {
            hideSuggestions();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    initializeSearch();
});

/* ==========================================
   STUDENT DIRECTORY FUNCTIONALITY
========================================== */

function initializeDirectory() {
    const tableBody = document.getElementById("studentTableBody");

    // Only run this code on list.html
    if (!tableBody) return;

    const searchInput = document.getElementById("directorySearch");
    const classFilter = document.getElementById("classFilter");
    const sortFilter = document.getElementById("sortFilter");
    const refreshButton = document.getElementById("refreshStudents");
    const countLabel = document.getElementById("studentCount");
    const tableStatus = document.getElementById("tableStatus");

    let searchTimer;
    let requestNumber = 0;

    // Create a safe text element
    function createElement(tag, text, className = "") {
        const element = document.createElement(tag);
        element.textContent = text == null ? "" : String(text);

        if (className) element.className = className;

        return element;
    }

    // FETCH STUDENTS
    async function loadDirectory() {
        const currentRequest = ++requestNumber;

        const params = new URLSearchParams();

        const search = searchInput.value.trim();
        const selectedClass = classFilter.value;
        const sort = sortFilter.value;

        if (search) params.set("search", search);
        if (selectedClass) params.set("studentClass", selectedClass);
        params.set("sort", sort);

        tableBody.replaceChildren();

        const loadingRow = document.createElement("tr");
        const loadingCell = createElement(
            "td",
            "Loading student records...",
            "table-message"
        );

        loadingCell.colSpan = 7;
        loadingRow.appendChild(loadingCell);
        tableBody.appendChild(loadingRow);

        tableStatus.textContent = "Loading records...";

        try {
            const response = await fetch("/std?" + params.toString());

            if (!response.ok) throw new Error("Failed to load students");

            const students = await response.json();

            // Ignore an older response if a new search started
            if (currentRequest !== requestNumber) return;

            renderStudents(students);

        } catch (error) {
            if (currentRequest !== requestNumber) return;

            console.error(error);
            renderMessage("Unable to load records. Please try again.");
            countLabel.textContent = "Unavailable";
            tableStatus.textContent = "Connection error";
        }
    }

    // DISPLAY TABLE MESSAGE
    function renderMessage(message) {
        tableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = createElement("td", message, "table-message");

        cell.colSpan = 7;
        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    // DISPLAY STUDENTS
    function renderStudents(students) {
        tableBody.replaceChildren();

        const count = students.length;

        countLabel.textContent =
            count + (count === 1 ? " Student" : " Students");

        tableStatus.textContent =
            "Showing " + count + " student record(s)";

        if (count === 0) {
            renderMessage("No matching students found.");
            return;
        }

        students.forEach(student => {
            const row = document.createElement("tr");

            // STUDENT ID
            const idCell = document.createElement("td");
            idCell.appendChild(
                createElement("span", student.student_id, "student-id")
            );

            // STUDENT PROFILE
            const nameCell = document.createElement("td");
            const profile = document.createElement("div");
            profile.className = "student-profile";

            const name = String(student.student_name || "Unknown");

            const initials = name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(word => word.charAt(0).toUpperCase())
                .join("");

            const avatar = createElement(
                "span",
                initials || "?",
                "student-avatar"
            );

            const nameText = createElement("strong", name);

            profile.append(avatar, nameText);
            nameCell.appendChild(profile);

            // CLASS
            const classCell = document.createElement("td");
            classCell.appendChild(
                createElement("span", student.class, "class-badge")
            );

            // MARKS
            const marksCell = document.createElement("td");
            marksCell.appendChild(
                createElement("span", student.total, "marks-value")
            );

            // AGE
            const ageCell = createElement("td", student.age);

            // PHONE
            const phoneCell = createElement("td", student.phnno);

            // ACTIONS
            const actionCell = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "table-actions";

            const id = encodeURIComponent(student.student_id);

            const links = [
                {
                    href: "listOne.html?sno=" + id,
                    icon: "fa-eye",
                    title: "View Student",
                    className: "action-btn"
                },
                {
                    href: "update.html?sno=" + id,
                    icon: "fa-pen",
                    title: "Edit Student",
                    className: "action-btn"
                },
                {
                    href: "delete.html?sno=" + id,
                    icon: "fa-trash",
                    title: "Delete Student",
                    className: "action-btn delete-action"
                }
            ];

            links.forEach(linkData => {
                const link = document.createElement("a");
                link.href = linkData.href;
                link.className = linkData.className;
                link.title = linkData.title;
                link.setAttribute("aria-label", linkData.title);

                const icon = document.createElement("i");
                icon.className = "fa-solid " + linkData.icon;

                link.appendChild(icon);
                actions.appendChild(link);
            });

            actionCell.appendChild(actions);

            row.append(
                idCell,
                nameCell,
                classCell,
                marksCell,
                ageCell,
                phoneCell,
                actionCell
            );

            tableBody.appendChild(row);
        });
    }

    // POPULATE CLASS DROPDOWN
    async function loadClasses() {
        try {
            const response = await fetch("/classes");

            if (!response.ok) throw new Error("Cannot load classes");

            const classes = await response.json();

            classFilter.replaceChildren();

            const allOption = document.createElement("option");
            allOption.value = "";
            allOption.textContent = "All Classes";
            classFilter.appendChild(allOption);

            classes.forEach(studentClass => {
                const option = document.createElement("option");
                option.value = studentClass;
                option.textContent = "Class " + studentClass;
                classFilter.appendChild(option);
            });

        } catch (error) {
            console.error("Class filter error:", error);
        }
    }

    // SEARCH WITH DEBOUNCE
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(loadDirectory, 250);
    });

    classFilter.addEventListener("change", loadDirectory);
    sortFilter.addEventListener("change", loadDirectory);

    refreshButton.addEventListener("click", async () => {
        await loadClasses();
        await loadDirectory();
    });

    // INITIAL LOAD
    loadClasses();
    loadDirectory();
}

// Initialize only after the page is ready
document.addEventListener("DOMContentLoaded", initializeDirectory);

/* ==========================================
   STUDENT PROFILE & SMART SEARCH
========================================== */

function initializeStudentProfile() {
    const input = document.getElementById("profileSearchInput");

    // Run only on listOne.html
    if (!input) return;

    const suggestions = document.getElementById("profileSuggestions");
    const searchButton = document.getElementById("profileSearchButton");
    const profileCard = document.getElementById("studentProfile");
    const messageBox = document.getElementById("profileMessage");

    let searchTimer;
    let searchController;
    let profileRequestNumber = 0;

    function showMessage(message, isError = false) {
        messageBox.textContent = message;
        messageBox.className =
            "profile-message" + (isError ? " error" : "");
        messageBox.hidden = false;
    }

    function clearMessage() {
        messageBox.hidden = true;
    }

    function hideSuggestions() {
        suggestions.hidden = true;
        input.setAttribute("aria-expanded", "false");
    }

    function showSuggestions() {
        suggestions.hidden = false;
        input.setAttribute("aria-expanded", "true");
    }

    function getInitials(name) {
        return String(name || "")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join("") || "?";
    }

    function setText(id, value) {
        document.getElementById(id).textContent =
            value == null ? "--" : String(value);
    }

    function renderProfile(student) {
        setText("profileName", student.student_name);
        setText("profileStudentId", student.student_id);
        setText("detailId", student.student_id);
        setText("detailClass", student.class);
        setText("detailMarks", student.total);
        setText("detailAge", student.age);
        setText("detailPhone", student.phnno);

        setText("profileAvatar", getInitials(student.student_name));

        const encodedId = encodeURIComponent(student.student_id);

        document.getElementById("profileEditLink").href =
            "update.html?sno=" + encodedId;

        document.getElementById("profileDeleteLink").href =
            "delete.html?sno=" + encodedId;

        profileCard.hidden = false;
        clearMessage();
    }

    // LOAD EXACT STUDENT BY ID
    async function loadStudentById(studentId) {
        const currentRequest = ++profileRequestNumber;

        profileCard.hidden = true;
        hideSuggestions();
        showMessage("Searching student records...");

        try {
            const response = await fetch(
                "/std/" + encodeURIComponent(studentId)
            );

            if (!response.ok) {
                throw new Error("Unable to retrieve student.");
            }

            const data = await response.json();

            if (currentRequest !== profileRequestNumber) return;

            if (!Array.isArray(data) || data.length === 0) {
                showMessage("Student not found. Try another ID.", true);
                return;
            }

            renderProfile(data[0]);

            input.value = String(data[0].student_id);

            // Update URL without refreshing
            const url = new URL(window.location.href);
            url.searchParams.set("sno", data[0].student_id);
            window.history.replaceState({}, "", url);

        } catch (error) {
            if (currentRequest !== profileRequestNumber) return;

            console.error(error);
            showMessage("Unable to load student details.", true);
        }
    }

    // LIVE SUGGESTIONS
    async function findSuggestions(query) {
        if (searchController) searchController.abort();

        searchController = new AbortController();
        const controller = searchController;

        try {
            const response = await fetch(
                "/std?search=" + encodeURIComponent(query),
                { signal: controller.signal }
            );

            if (!response.ok) throw new Error("Search failed");

            const students = await response.json();

            // Ignore results from outdated searches
            if (input.value.trim() !== query) return;

            suggestions.replaceChildren();

            if (students.length === 0) {
                const empty = document.createElement("div");
                empty.className = "search-message";
                empty.textContent = "No matching students.";
                suggestions.appendChild(empty);
            } else {
                students.slice(0, 8).forEach(student => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "profile-suggestion-item";
                    button.setAttribute("role", "option");

                    const name = document.createElement("strong");
                    name.textContent = student.student_name;

                    const id = document.createElement("small");
                    id.textContent = "ID: " + student.student_id;

                    button.append(name, id);

                    button.addEventListener("click", () => {
                        input.value = String(student.student_id);
                        loadStudentById(student.student_id);
                    });

                    suggestions.appendChild(button);
                });
            }

            showSuggestions();

        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
        }
    }

    input.addEventListener("input", () => {
        clearTimeout(searchTimer);

        if (searchController) searchController.abort();

        ++profileRequestNumber;
        profileCard.hidden = true;
        clearMessage();

        const query = input.value.trim();

        suggestions.replaceChildren();

        if (!query) {
            hideSuggestions();
            return;
        }

        searchTimer = setTimeout(() => {
            findSuggestions(query);
        }, 250);
    });

    // SEARCH BUTTON
    searchButton.addEventListener("click", () => {
        const query = input.value.trim();

        if (!query) {
            showMessage("Please enter a student name or ID.", true);
            return;
        }

        if (/^\d+$/.test(query)) {
            loadStudentById(query);
        } else {
            // Name searches use the dropdown
            findSuggestions(query);
            showMessage(
                "Select the correct student from the suggestions."
            );
        }
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchButton.click();
        }

        if (event.key === "Escape") {
            hideSuggestions();
        }
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".profile-search-box")) {
            hideSuggestions();
        }
    });

    // AUTO-LOAD STUDENT FROM URL
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("sno");

    if (studentId) {
        input.value = studentId;
        loadStudentById(studentId);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeStudentProfile
);

/* ==========================================
   ADD STUDENT / REGISTRATION PAGE
========================================== */

function initializeStudentRegistration() {
    const form = document.getElementById("studentRegistrationForm");

    if (!form) return;

    const saveButton = document.getElementById("saveStudentButton");
    const messageBox = document.getElementById("registrationMessage");

    if (!saveButton || !messageBox) {
        console.error("Registration button or message element not found.");
        return;
    }

    function showRegistrationMessage(message, isError = false) {
        messageBox.textContent = message;
        messageBox.className =
            "registration-message " + (isError ? "error" : "success");
        messageBox.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const student = {
            sno: document.getElementById("sno").value.trim(),
            name: document.getElementById("name").value.trim(),
            studentClass: document.getElementById("studentClass").value,
            total: document.getElementById("total").value,
            age: document.getElementById("age").value,
            phnno: document.getElementById("phnno").value.trim()
        };

        if (!Number.isInteger(Number(student.sno)) ||
            Number(student.sno) <= 0) {
            showRegistrationMessage("Please enter a valid Student ID.", true);
            return;
        }

        if (!student.name) {
            showRegistrationMessage("Please enter the student's name.", true);
            return;
        }

        if (!/^[0-9]{10}$/.test(student.phnno)) {
            showRegistrationMessage(
                "Phone number must contain exactly 10 digits.",
                true
            );
            return;
        }

        saveButton.disabled = true;
        saveButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        messageBox.hidden = true;

        try {
            const response = await fetch("/std", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(student)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to add student."
                );
            }

            // Reset FIRST, then display success message.
            form.reset();

            showRegistrationMessage(
                "✓ Student added successfully! Student ID: " + student.sno
            );

            messageBox.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        } catch (error) {
            console.error(error);

            showRegistrationMessage(
                error.message || "Something went wrong.",
                true
            );

        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML =
                '<i class="fa-solid fa-circle-check"></i> Save Student';
        }
    });

    // Hide the message only when the form is manually reset.
    // The success message is shown AFTER form.reset().
    form.addEventListener("reset", () => {
        messageBox.hidden = true;
    });
}

document.addEventListener(
    "DOMContentLoaded",
    initializeStudentRegistration
);


/* ==========================================
   UPDATE STUDENT FUNCTIONALITY
========================================== */

function initializeStudentUpdate() {
    const form = document.getElementById("editStudentForm");

    // Run only on update.html
    if (!form) return;

    const searchInput = document.getElementById("editSearchInput");
    const suggestions = document.getElementById("editSuggestions");
    const findButton = document.getElementById("editFindButton");
    const formCard = document.getElementById("editFormCard");
    const messageBox = document.getElementById("editMessage");
    const saveButton = document.getElementById("editSaveButton");
    const resetButton = document.getElementById("editResetButton");

    let originalStudent = null;
    let searchTimer;
    let searchController;
    let recordRequestNumber = 0;

    function showMessage(message, isError = false) {
        messageBox.textContent = message;
        messageBox.className =
            "edit-message" + (isError ? " error" : "");
        messageBox.hidden = false;
    }

    function clearMessage() {
        messageBox.hidden = true;
    }

    function hideSuggestions() {
        suggestions.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
    }

    function showSuggestions() {
        suggestions.hidden = false;
        searchInput.setAttribute("aria-expanded", "true");
    }

    function fillForm(student) {
        document.getElementById("editSno").value = student.student_id;
        document.getElementById("editName").value = student.student_name;
        document.getElementById("editClass").value = student.class;
        document.getElementById("editTotal").value = student.total;
        document.getElementById("editAge").value = student.age;
        document.getElementById("editPhone").value = student.phnno;

        formCard.hidden = false;
    }

    // LOAD SELECTED STUDENT
    async function loadStudent(studentId) {
        const currentRequest = ++recordRequestNumber;

        originalStudent = null;
        formCard.hidden = true;
        hideSuggestions();
        showMessage("Loading student details...");

        try {
            const response = await fetch(
                "/std/" + encodeURIComponent(studentId)
            );

            if (!response.ok) {
                throw new Error("Unable to load student.");
            }

            const students = await response.json();

            if (currentRequest !== recordRequestNumber) return;

            if (!Array.isArray(students) || students.length === 0) {
                showMessage("Student not found.", true);
                return;
            }

            originalStudent = students[0];

            fillForm(originalStudent);
            clearMessage();

            searchInput.value = String(originalStudent.student_id);

            const url = new URL(window.location.href);
            url.searchParams.set("sno", originalStudent.student_id);
            window.history.replaceState({}, "", url);

        } catch (error) {
            if (currentRequest !== recordRequestNumber) return;

            console.error(error);
            showMessage(error.message, true);
        }
    }

    // LIVE STUDENT SUGGESTIONS
    async function findSuggestions(query) {
        if (searchController) searchController.abort();

        searchController = new AbortController();
        const controller = searchController;

        try {
            const response = await fetch(
                "/std?search=" + encodeURIComponent(query),
                { signal: controller.signal }
            );

            if (!response.ok) throw new Error("Search failed");

            const students = await response.json();

            if (searchInput.value.trim() !== query) return;

            suggestions.replaceChildren();

            if (students.length === 0) {
                const empty = document.createElement("div");
                empty.className = "search-message";
                empty.textContent = "No matching students.";
                suggestions.appendChild(empty);
            } else {
                students.slice(0, 8).forEach(student => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "edit-suggestion-item";
                    button.setAttribute("role", "option");

                    const name = document.createElement("strong");
                    name.textContent = student.student_name;

                    const id = document.createElement("small");
                    id.textContent = "ID: " + student.student_id;

                    button.append(name, id);

                    button.addEventListener("click", () => {
                        searchInput.value = String(student.student_id);
                        loadStudent(student.student_id);
                    });

                    suggestions.appendChild(button);
                });
            }

            showSuggestions();

        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
        }
    }

    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        if (searchController) searchController.abort();

        ++recordRequestNumber;
        originalStudent = null;
        formCard.hidden = true;
        clearMessage();

        const query = searchInput.value.trim();

        suggestions.replaceChildren();

        if (!query) {
            hideSuggestions();
            return;
        }

        searchTimer = setTimeout(() => {
            findSuggestions(query);
        }, 250);
    });

    // SEARCH BUTTON
    findButton.addEventListener("click", () => {
        const query = searchInput.value.trim();

        if (!query) {
            showMessage("Please enter a student name or ID.", true);
            return;
        }

        if (/^\d+$/.test(query)) {
            loadStudent(query);
        } else {
            findSuggestions(query);
            showMessage(
                "Select the student you want to edit from the dropdown."
            );
        }
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            findButton.click();
        }

        if (event.key === "Escape") {
            hideSuggestions();
        }
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".edit-search-box")) {
            hideSuggestions();
        }
    });

    // RESET TO ORIGINAL DETAILS
    resetButton.addEventListener("click", () => {
        if (!originalStudent) return;

        fillForm(originalStudent);
        showMessage("Original student details restored.");
    });

    // SAVE UPDATED DETAILS
    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!originalStudent) {
            showMessage("Please select a student first.", true);
            return;
        }

        if (!form.reportValidity()) return;

        const updatedStudent = {
            name: document.getElementById("editName").value.trim(),
            total: document.getElementById("editTotal").value,
            age: document.getElementById("editAge").value,
            phnno: document.getElementById("editPhone").value.trim()
        };

        if (!updatedStudent.name ||
            !/^[0-9]{10}$/.test(updatedStudent.phnno)) {
            showMessage("Please enter valid student details.", true);
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving Changes...";
        clearMessage();

        try {
            const response = await fetch(
                "/std/" + encodeURIComponent(originalStudent.student_id),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(updatedStudent)
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to update student."
                );
            }

            originalStudent = {
                ...originalStudent,
                student_name: updatedStudent.name,
                total: updatedStudent.total,
                age: updatedStudent.age,
                phnno: updatedStudent.phnno
            };

            fillForm(originalStudent);

            showMessage(
                result.message || "Student updated successfully!"
            );

        } catch (error) {
            console.error(error);
            showMessage(error.message, true);

        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        }
    });

    // AUTO LOAD FROM DIRECTORY OR PROFILE
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("sno");

    if (studentId) {
        searchInput.value = studentId;
        loadStudent(studentId);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeStudentUpdate
);

/* ==========================================
   DELETE STUDENT FUNCTIONALITY
========================================== */

function initializeStudentDeletion() {
    const input = document.getElementById("deleteSearchInput");

    // Only run on delete.html
    if (!input) return;

    const suggestions = document.getElementById("deleteSuggestions");
    const findButton = document.getElementById("deleteFindButton");
    const preview = document.getElementById("deletePreview");
    const messageBox = document.getElementById("deleteMessage");

    const deleteButton = document.getElementById("deleteStudentButton");
    const dialog = document.getElementById("deleteConfirmDialog");
    const cancelButton = document.getElementById("cancelDeleteButton");
    const confirmButton = document.getElementById("confirmDeleteButton");

    let selectedStudent = null;
    let searchTimer;
    let searchController;
    let requestNumber = 0;
    let deleting = false;

    function showMessage(message, isError = false) {
        messageBox.textContent = message;
        messageBox.className =
            "delete-message" + (isError ? " error" : "");
        messageBox.hidden = false;
    }

    function clearMessage() {
        messageBox.hidden = true;
    }

    function hideSuggestions() {
        suggestions.hidden = true;
        input.setAttribute("aria-expanded", "false");
    }

    function showSuggestions() {
        suggestions.hidden = false;
        input.setAttribute("aria-expanded", "true");
    }

    function getInitials(name) {
        return String(name || "")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join("") || "?";
    }

    function setText(id, value) {
        document.getElementById(id).textContent =
            value == null ? "--" : String(value);
    }

    function displayStudent(student) {
        selectedStudent = student;

        setText("deleteAvatar", getInitials(student.student_name));
        setText("deleteStudentName", student.student_name);
        setText("deleteStudentId", student.student_id);
        setText("deleteClass", student.class);
        setText("deleteMarks", student.total);
        setText("deleteAge", student.age);
        setText("deletePhone", student.phnno);

        preview.hidden = false;
        clearMessage();
    }

    // LOAD STUDENT BY EXACT ID
    async function loadStudent(studentId) {
        const currentRequest = ++requestNumber;

        selectedStudent = null;
        preview.hidden = true;
        hideSuggestions();

        showMessage("Loading student information...");

        try {
            const response = await fetch(
                "/std/" + encodeURIComponent(studentId)
            );

            if (!response.ok) {
                throw new Error("Unable to retrieve student.");
            }

            const students = await response.json();

            if (currentRequest !== requestNumber) return;

            if (!Array.isArray(students) || students.length === 0) {
                showMessage("Student not found.", true);
                return;
            }

            displayStudent(students[0]);
            input.value = String(students[0].student_id);

            const url = new URL(window.location.href);
            url.searchParams.set("sno", students[0].student_id);
            window.history.replaceState({}, "", url);

        } catch (error) {
            if (currentRequest !== requestNumber) return;

            console.error(error);
            showMessage(error.message, true);
        }
    }

    // SEARCH SUGGESTIONS
    async function findSuggestions(query) {
        if (searchController) searchController.abort();

        searchController = new AbortController();
        const controller = searchController;

        try {
            const response = await fetch(
                "/std?search=" + encodeURIComponent(query),
                { signal: controller.signal }
            );

            if (!response.ok) throw new Error("Search failed");

            const students = await response.json();

            if (input.value.trim() !== query) return;

            suggestions.replaceChildren();

            if (students.length === 0) {
                const empty = document.createElement("div");
                empty.className = "search-message";
                empty.textContent = "No matching students.";
                suggestions.appendChild(empty);
            } else {
                students.slice(0, 8).forEach(student => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "delete-suggestion-item";
                    button.setAttribute("role", "option");

                    const name = document.createElement("strong");
                    name.textContent = student.student_name;

                    const id = document.createElement("small");
                    id.textContent = "ID: " + student.student_id;

                    button.append(name, id);

                    button.addEventListener("click", () => {
                        input.value = String(student.student_id);
                        loadStudent(student.student_id);
                    });

                    suggestions.appendChild(button);
                });
            }

            showSuggestions();

        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
        }
    }

    input.addEventListener("input", () => {
        clearTimeout(searchTimer);

        if (searchController) searchController.abort();

        ++requestNumber;
        selectedStudent = null;
        preview.hidden = true;
        clearMessage();

        const query = input.value.trim();

        suggestions.replaceChildren();

        if (!query) {
            hideSuggestions();
            return;
        }

        searchTimer = setTimeout(() => {
            findSuggestions(query);
        }, 250);
    });

    findButton.addEventListener("click", () => {
        const query = input.value.trim();

        if (!query) {
            showMessage("Please enter a student name or ID.", true);
            return;
        }

        if (/^\d+$/.test(query)) {
            loadStudent(query);
        } else {
            findSuggestions(query);
            showMessage(
                "Select the student you wish to delete from the dropdown."
            );
        }
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            findButton.click();
        }

        if (event.key === "Escape") {
            hideSuggestions();
        }
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".delete-search-box")) {
            hideSuggestions();
        }
    });

    // OPEN CONFIRMATION DIALOG
    deleteButton.addEventListener("click", () => {
        if (!selectedStudent || deleting) return;

        setText("confirmStudentName", selectedStudent.student_name);
        setText("confirmStudentId", selectedStudent.student_id);

        dialog.showModal();
    });

    // CANCEL DELETION
    cancelButton.addEventListener("click", () => {
        dialog.close();
    });

    // PERMANENT DELETE
    confirmButton.addEventListener("click", async () => {
        if (!selectedStudent || deleting) return;

        deleting = true;
        confirmButton.disabled = true;
        confirmButton.textContent = "Deleting...";

        const studentId = selectedStudent.student_id;

        try {
            const response = await fetch(
                "/std/" + encodeURIComponent(studentId),
                { method: "DELETE" }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to delete student."
                );
            }

            dialog.close();

            selectedStudent = null;
            preview.hidden = true;
            input.value = "";
            suggestions.replaceChildren();
            hideSuggestions();

            const url = new URL(window.location.href);
            url.searchParams.delete("sno");
            window.history.replaceState({}, "", url);

            showMessage(
                result.message || "Student deleted successfully!"
            );

        } catch (error) {
            console.error(error);

            dialog.close();
            showMessage(error.message, true);

        } finally {
            deleting = false;
            confirmButton.disabled = false;
            confirmButton.textContent = "Yes, Delete";
        }
    });

    // AUTO-LOAD FROM STUDENT DIRECTORY OR PROFILE
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("sno");

    if (studentId) {
        input.value = studentId;
        loadStudent(studentId);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeStudentDeletion
);

async function loadStudentIdDropdown(inputId) {
    const input = document.getElementById(inputId);

    if (!input) return;

    // Create a dropdown list connected to the input
    const datalistId = inputId + "Options";
    let datalist = document.getElementById(datalistId);

    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = datalistId;
        input.insertAdjacentElement("afterend", datalist);
    }

    input.setAttribute("list", datalistId);
    input.setAttribute("autocomplete", "off");

    try {
        const response = await fetch("/std");

        if (!response.ok) {
            throw new Error("Unable to load student IDs");
        }

        const students = await response.json();

        datalist.replaceChildren();

        students.forEach(student => {
            const option = document.createElement("option");

            option.value = String(student.student_id);
            option.label = student.student_name;

            datalist.appendChild(option);
        });

    } catch (error) {
        console.error("Student ID dropdown error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadStudentIdDropdown("profileSearchInput");
    loadStudentIdDropdown("editSearchInput");
    loadStudentIdDropdown("deleteSearchInput");
});
