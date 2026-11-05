"use client";

import { useEffect, useRef, useState } from "react";
import "./planer.css";
import "./planer-mobile.css";
import "./planer-notes.css";
import { createClient } from "@/lib/supabase/client";

const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const hours = Array.from({ length: 24 }, (_, index) => index);

function formatTime(time) {
    const [hour, minute] = time.split(":").map(Number);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

// short label for phones: "1 AM", "12 PM"
function formatHour(hour) {
    return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}

// first line of a note = title, the rest = preview (like iPhone Notes)
function splitNote(text) {
    const lines = text.split("\n");
    const title = lines[0].trim() || "New note";
    const preview = lines.slice(1).join(" ").trim();

    return { title, preview };
}

function minutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}
function getMonday(date) {
    const monday = new Date(date);
    const day = monday.getDay();
    const difference = (day + 6) % 7;

    monday.setDate(monday.getDate() - difference);
    monday.setHours(0, 0, 0, 0);

    return monday;
}
function getDayOfWeek(date) {
    const day = date.getDay();
    return (day + 6) % 7;
}
function getDateForDay(startOfWeek, index) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + index);

    return date.toLocaleDateString("sr-RS", {
        day: "2-digit",
        month: "2-digit",
    });
}
function dayLabel(){
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;
        return `${day}.${month}.`;
    }

function getCurrentWeek() {
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay();
    const difference = (day + 6) % 7;

    monday.setDate(today.getDate() - difference);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { monday, sunday };
}

export default function PlanerPage() {
    const supabase = createClient();
    const currentWeek = getCurrentWeek();
    const currentDay = dayLabel();
    const weekLabel =
        `${currentWeek.monday.toLocaleDateString("sr-RS", {
            day: "2-digit",
            month: "2-digit"
        })} – ${currentWeek.sunday.toLocaleDateString("sr-RS", {
            day: "2-digit",
            month: "2-digit"
        })}`;

    const startOfWeek = getMonday(new Date());
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);

    const [addingType, setAddingType] = useState(null);
    const [selectedCell, setSelectedCell] = useState(null);

    const [taskName, setTaskName] = useState("");
    const [eventName, setEventName] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [notes, setNotes] = useState([]);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [edit, setEdit] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [forDelete, setForDelete] = useState([]);
    const [deleteSelect, setDeleteSelect] = useState(null);
    const [showTransformButton, setShowTransformButton] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resizing, setResizing] = useState(null);
    const [userId, setUserId] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);   

    // phone layout
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [notesOpen, setNotesOpen] = useState(false);
    const [upcomingOpen, setUpcomingOpen] = useState(false);
    const scrollRef = useRef(null);

    // On phones, start on today + the next day, near the current hour.
    // Runs on load and again whenever the screen becomes phone-sized
    // (rotating the phone, or switching on DevTools device mode after load).
    useEffect(() => {
    async function loadData() {
        setDataLoading(true);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            window.location.href = "/login";
            return;
        }

        setUserId(user.id);

        const weekStart = getMonday(new Date())
            .toLocaleDateString("en-CA");

        const [tasksResult, eventsResult, notesResult] = await Promise.all([
            supabase
                .from("tasks")
                .select("*")
                .eq("user_id", user.id)
                .eq("week_start", weekStart),

            supabase
                .from("events")
                .select("*")
                .eq("user_id", user.id)
                .eq("week_start", weekStart),

            supabase
                .from("notes")
                .select("*")
                .eq("user_id", user.id),
        ]);

        if (tasksResult.error || eventsResult.error || notesResult.error) {
            console.error(
                "Greška pri učitavanju:",
                tasksResult.error || eventsResult.error || notesResult.error
            );
            setDataLoading(false);
            return;
        }

        setTasks(
            tasksResult.data.map((item) => ({
                ...item,
                start: item.start_time,
                end: item.end_time,
                type: "task",
            }))
        );

        setEvents(
            eventsResult.data.map((item) => ({
                ...item,
                start: item.start_time,
                end: item.end_time,
                type: "event",
            }))
        );

        setNotes(
        notesResult.data.map((note) => ({
            id: note.id,
            text: note.content,
            isNew: false,
        }))
    );

        setDataLoading(false);
    }

    loadData();
}, []);
    useEffect(() => {
        const phone = window.matchMedia("(max-width: 700px)");

        function scrollToToday() {
            const box = scrollRef.current;

            if (!box || !phone.matches) {
                return;
            }

            const columns = box.querySelectorAll(".day-column");
            const cell = box.querySelector(".hour-cell");

            if (columns.length === 0 || !cell) {
                return;
            }

            const today = new Date();
            const dayWidth = columns[0].getBoundingClientRect().width;
            const hourHeight = cell.getBoundingClientRect().height;

            // two days are visible, so Sunday can't be the first visible column
            box.scrollLeft = Math.min(getDayOfWeek(today), 5) * dayWidth;
            // current hour sits right under the day headers
            box.scrollTop = today.getHours() * hourHeight;
        }

        scrollToToday();

        phone.addEventListener("change", scrollToToday);
        return () => phone.removeEventListener("change", scrollToToday);
    }, []);

    function closeModal() {
        setAddingType(null);
        setSelectedCell(null);
    }

    function openModal(type) {
        setAddingType(type);
        setSelectedCell(null);
        setTaskName("");
        setEventName("");
        setStartTime("");
        setEndTime("");
    }
    // Notes work like iPhone Notes: the list shows your notes, tapping one opens it
    // full-page, the check button saves and closes it, the bin deletes it,
    // and an empty note disappears.
    function startNewNote() {
        const newNote = {
            id: crypto.randomUUID(),
            text: "",
            isNew: true,
        };

        setNotes((previous) => [...previous, newNote]);
        setEditingNoteId(newNote.id);
    }

    function changeNote(id, text) {
        setNotes((previous) =>
            previous.map((note) => (note.id === id ? { ...note, text } : note))
        );
    }

    async function finishNote(id) {
    const note = notes.find((item) => item.id === id);

    if (!note) {
        return;
    }

    const content = note.text.trim();

    // Ako je beleška prazna, uklanjamo je.
    if (!content) {
        setNotes((previous) =>
            previous.filter((item) => item.id !== id)
        );

        if (!note.isNew) {
            const { error } = await supabase
                .from("notes")
                .delete()
                .eq("id", id)
                .eq("user_id", userId);

            if (error) {
                console.error("Greška pri brisanju beleške:", error.message);
            }
        }

        setEditingNoteId(null);
        return;
    }

    // Nova beleška se upisuje u bazu.
    if (note.isNew) {
        const { error } = await supabase
            .from("notes")
            .insert({
                id: note.id,
                user_id: userId,
                content,
            });

        if (error) {
            console.error("Greška pri čuvanju beleške:", error.message);
            return;
        }

        setNotes((previous) =>
            previous.map((item) =>
                item.id === id
                    ? { ...item, text: content, isNew: false }
                    : item
            )
        );
    } else {
        // Postojeća beleška se ažurira.
        const { error } = await supabase
            .from("notes")
            .update({ content })
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Greška pri izmeni beleške:", error.message);
            return;
        }
    }

    setEditingNoteId(null);
}

    async function deleteNote(id) {
    const note = notes.find((item) => item.id === id);

    if (!note) {
        return;
    }

    if (!note.isNew) {
        const { error } = await supabase
            .from("notes")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            console.error("Greška pri brisanju beleške:", error.message);
            return;
        }
    }

    setNotes((previous) =>
        previous.filter((item) => item.id !== id)
    );

    if (editingNoteId === id) {
        setEditingNoteId(null);
    }
}
    function selectCell(day, hour) {
        if (!addingType) {
            return;
        }
        setSelectedCell({ day, hour });
        setStartTime(`${String(hour).padStart(2, "0")}:00`);
        setEndTime(
            hour === 23 ? "23:59" : `${String(hour + 1).padStart(2, "0")}:00`
        );
    }

    
async function saveItem() {
    const name =
        addingType === "task" ? taskName.trim() : eventName.trim();

    if (!name || !selectedCell || !userId) {
        return;
    }

    if (minutes(endTime) <= minutes(startTime)) {
        return;
    }

    const newItem = {
        user_id: userId,
        name,
        day: selectedCell.day,
        start_time: startTime,
        end_time: endTime,
        description: "",
        week_start: getMonday(new Date()).toLocaleDateString("en-CA"),
    };

    const table = addingType === "task" ? "tasks" : "events";

    const { data, error } = await supabase
        .from(table)
        .insert(newItem)
        .select()
        .single();

    if (error) {
        console.error("Greška pri čuvanju:", error.message);
        return;
    }

    const savedItem = {
        ...data,
        start: data.start_time,
        end: data.end_time,
        type: addingType,
    };

    if (addingType === "task") {
        setTasks((previous) => [...previous, savedItem]);
        setTaskName("");
    } else {
        setEvents((previous) => [...previous, savedItem]);
        setEventName("");
    }

    setSelectedCell(null);
}

    function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
    }

    function minutesToTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    // Position and size come from the CSS variable --hour-height, so the
    // blocks always line up with the grid (desktop, phone, window resize).
    function getItemStyle(item) {
        const startHours = minutes(item.start) / 60;
        const lengthHours = (minutes(item.end) - minutes(item.start)) / 60;

        return {
            top: `calc(var(--hour-height) * ${startHours} + 2px)`,
            height: `max(18px, calc(var(--hour-height) * ${lengthHours} - 4px))`,
        };
    }
    
    
async function saveEdit() {
    if (
        selectedItem === null ||
        !edit.trim() ||
        minutes(endTime) <= minutes(startTime)
    ) {
        return;
    }

    const table = selectedItem.type === "task" ? "tasks" : "events";

    const { error } = await supabase
        .from(table)
        .update({
            name: edit.trim(),
            description: editDescription,
            start_time: startTime,
            end_time: endTime,
        })
        .eq("id", selectedItem.id)
        .eq("user_id", userId);

    if (error) {
        console.error("Greška pri izmeni:", error.message);
        return;
    }

    const updateItem = (item) => {
        if (item.id === selectedItem.id) {
            return {
                ...item,
                name: edit.trim(),
                description: editDescription,
                start: startTime,
                end: endTime,
            };
        }

        return item;
    };

    if (selectedItem.type === "task") {
        setTasks((previous) => previous.map(updateItem));
    } else {
        setEvents((previous) => previous.map(updateItem));
    }

    setSelectedItem(null);
}


    
async function deleteItem() {
    if (selectedItem === null) {
        return;
    }

    const table = selectedItem.type === "task" ? "tasks" : "events";

    const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", selectedItem.id)
        .eq("user_id", userId);

    if (error) {
        console.error("Greška pri brisanju:", error.message);
        return;
    }

    if (selectedItem.type === "task") {
        setTasks((previous) =>
            previous.filter((item) => item.id !== selectedItem.id)
        );
    } else {
        setEvents((previous) =>
            previous.filter((item) => item.id !== selectedItem.id)
        );
    }

    setSelectedItem(null);
}

    
async function deleteItems() {
    const taskIds = tasks
        .filter((item) => forDelete.includes(item.id))
        .map((item) => item.id);

    const eventIds = events
        .filter((item) => forDelete.includes(item.id))
        .map((item) => item.id);

    if (taskIds.length > 0) {
        const { error } = await supabase
            .from("tasks")
            .delete()
            .in("id", taskIds)
            .eq("user_id", userId);

        if (error) {
            console.error("Greška pri brisanju zadataka:", error.message);
            return;
        }
    }

    if (eventIds.length > 0) {
        const { error } = await supabase
            .from("events")
            .delete()
            .in("id", eventIds)
            .eq("user_id", userId);

        if (error) {
            console.error("Greška pri brisanju događaja:", error.message);
            return;
        }
    }

    setTasks((previous) =>
        previous.filter((item) => !taskIds.includes(item.id))
    );

    setEvents((previous) =>
        previous.filter((item) => !eventIds.includes(item.id))
    );

    setForDelete([]);
    setDeleteSelect(null);
    setSelectedItem(null);
}


    function cancelEdit() {
        setSelectedItem(null);
    }


    // phone: closes the right-hand drawer (edit / upcoming)
    function closeRightPanel() {
        setSelectedItem(null);
        setUpcomingOpen(false);
    }
    function closeNotes() {
    if (editingNoteId !== null) {
        finishNote(editingNoteId);
    } 
    setNotesOpen(false);
}

    const rightPanelOpen =
        upcomingOpen || (selectedItem !== null && deleteSelect == null);

    const editingNote = notes.find((note) => note.id === editingNoteId) || null;

    const allItems = [...tasks, ...events];

    return (
        <div className={`planner-page ${addMenuOpen ? "menu-open" : ""}`}>
            <header className="planner-topbar">
                <div className="brand">
                    <span className="brand-mark" />
                    Planner
                </div>
                <div className="topbar-actions">
                    <div className="delete-buttons-row">
                        {showTransformButton && (
                            <button
                                className="transform-button"
                                type="button"
                                onClick={() => {setDeleteSelect(null),
                                    setShowTransformButton(false),
                                    setForDelete([]),
                                    setSelectedItem(null);
                                }}
                            >
                                <span className="delete-x">×</span>
                            </button>
                        )}
                        <div className={`top-delete-wrapper ${deleteSelect ? "delete-active" : ""}`}>
                            <button
                                className="edit-delete-button top-delete-button"
                                type="button"
                                onClick={() => {
                                    if (deleteSelect === null) {
                                        setDeleteSelect(true)
                                        setTimeout(() => {
                                        setShowTransformButton(true);
                                    }, 300);;
                                    } else if(deleteSelect !== null && forDelete.length === 0){
                                    }
                                    else{
                                         setShowDeleteModal(true);
                                    }
                                }}
                            >
                                <span className="delete-label">Delete</span>
                                <span className="delete-x">🗑</span>
                            </button>
                        </div>
                        {showDeleteModal && (
                        <div className="modal-overlay-delete">
                            <div className="delete-modal">
                                <div className="delete-modal-heading">
                                </div>

                                <p className="delete-modal-message">
                                    This {addingType == "task" ? "task" : "event"} will be deleted from your planner.
                                </p>

                                <div className="delete-modal-actions">
                                    <button
                                        className="delete-modal-cancel"
                                        onClick={() => setShowDeleteModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="delete-modal-confirm"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setShowTransformButton(false);
                                            deleteItems();
                                        }}
                                    >
                                        I know, delete it.
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                    <div className="week-controls">
                    <p className="week-paragraph">Week: </p>
                    <button className="week-button">{weekLabel}</button>
                    <button
                        className="plus-button">
                            ＋
                    </button>
                    </div>
                    <button
                        className="cancel-mode-button"
                        onClick={() => {
                            closeModal();
                            setAddMenuOpen(false);
                        }}
                    >
                        ✔
                    </button>

                    <button
                        className="event-button"
                        onClick={() => openModal("event")}
                    >
                        <span className="button-symbol">+</span>
                        Add Event
                    </button>

                    <button
                        className="task-button"
                        onClick={() => openModal("task")}
                    >
                        <span className="button-symbol">+</span>
                        Add Task
                    </button>

                    <button
                        className="fab-button"
                        type="button"
                        aria-label="Add event or task"
                        onClick={() => {
                            if (addingType) {
                                // "+" also ends the current add mode and closes the menu
                                closeModal();
                                setAddMenuOpen(false);
                            } else {
                                setAddMenuOpen((previous) => !previous);
                            }
                        }}
                    >
                        +
                    </button>
                </div>
            </header>
            <div className="planner-layout">
                <div className="planner-scroll" ref={scrollRef}>
                <section className="planner-table-wrapper">
                    <div className="schedule">
                        <div className="time-column">
                            <div className="day-header time-header">
                                Time
                            </div>

                            {hours.map((hour) => (
                                <div className="hour-label" key={hour}>
                                    <span className="hour-full">
                                        {formatTime(
                                            `${String(hour).padStart(2, "0")}:00`
                                        )}
                                    </span>
                                    <span className="hour-short">{formatHour(hour)}</span>
                                </div>
                            ))}
                        </div>

                        {days.map((day) => (
                            <div className="day-column" key={day}>
                                <div className={`day-header ${days.indexOf(day) === getDayOfWeek(new Date()) ? "is-today" : ""}`}>
                                    <span className="day-date">{
                                    getDateForDay(startOfWeek, days.indexOf(day))}</span>
                                    <span>{day}</span>  
                                </div>
                                <div className="day-body">
                                    {hours.map((hour) => (
                                        <div
                                            className={`hour-cell ${
                                                addingType === "task"
                                                    ? "hour-cell-task-active"
                                                    : addingType === "event"
                                                        ? "hour-cell-event-active"
                                                        : ""
                                            }`}
                                            key={hour}
                                            onClick={() =>
                                                selectCell(day, hour)
                                            }
                                        />
                                    ))}

                                    {allItems
                                        .filter((item) => item.day === day)
                                        .map((item) => (
                                            <button onClick={() => {
                                                setSelectedItem(item);
                                                setEdit(item.name);
                                                setStartTime(item.start);
                                                setEndTime(item.end);
                                                setEditDescription(item.description || "");
                                                {if(deleteSelect){
                                                    if(forDelete.includes(item.id)) {
                                                    setForDelete((previous) =>
                                                    previous.filter((currentId) => currentId !== item.id)
                                                );
                                                }
                                                    else{
                                                        setForDelete((previous) => [...previous, item.id]);
                                                    }
                                                }
                                                }}}
                                                key={item.id}
                                                className={`${item.type === "event" ? "event-block" : "task-block"} ${
                                                deleteSelect && forDelete.includes(item.id)
                                                    ? "item-selected"
                                                    : ""
                                            }`}
                                                
                                                style={getItemStyle(item)}
                                            >
                                                <span className="item-name">
                                                    {item.name}
                                                </span>

                                                <span className="item-time">
                                                    {formatTime(item.start)}
                                                    {" - "}
                                                    {formatTime(item.end)}
                                                </span>
                                                <div
                                                className="resize-handle"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setResizing({
                                                        item: item,
                                                        startY: e.clientY,
                                                        originalEnd: timeToMinutes(item.end),
                                                    });

                                                    e.currentTarget.setPointerCapture(e.pointerId);
                                                }}
                                                onPointerMove={(e) => {
                                                if (resizing === null) {
                                                    return;
                                                }

                                                const hourHeight = e.currentTarget.closest(".day-body").querySelector(".hour-cell").getBoundingClientRect().height;
                                                const minuteHeight = hourHeight / 60;

                                                const difference = e.clientY - resizing.startY;
                                                const minutesDifference = Math.round(difference / minuteHeight / 5) * 5;

                                                let newEnd = Math.min(resizing.originalEnd + minutesDifference, 23 * 60 + 59);

                                                const start = timeToMinutes(resizing.item.start);

                                                if (newEnd < start + 15) {
                                                    newEnd = Math.min(start + 15, 23 * 60 + 59);
                                                }

                                                if (resizing.item.type === "event") {
                                                    setEvents((previous) =>
                                                        previous.map((event) => {
                                                            if (event.id === resizing.item.id) {
                                                                return { ...event, end: minutesToTime(newEnd) };
                                                            }

                                                            return event;
                                                        })
                                                    );
                                                } else {
                                                    setTasks((previous) =>
                                                        previous.map((task) => {
                                                            if (task.id === resizing.item.id) {
                                                                return { ...task, end: minutesToTime(newEnd) };
                                                            }

                                                            return task;
                                                        })
                                                    );
                                                }
                                            }}
                                                onPointerUp={async () => {
                                                if (!resizing) {
                                                    return;
                                                }

                                                const item = resizing.item;
                                                const table = item.type === "task" ? "tasks" : "events";

                                                const currentItems = item.type === "task" ? tasks : events;

                                                const updatedItem = currentItems.find(
                                                    (current) => current.id === item.id
                                                );

                                                setResizing(null);

                                                if (!updatedItem) {
                                                    return;
                                                }

                                                const { error } = await supabase
                                                    .from(table)
                                                    .update({
                                                        end_time: updatedItem.end,
                                                    })
                                                    .eq("id", item.id)
                                                    .eq("user_id", userId);

                                                if (error) {
                                                    console.error("Greška pri čuvanju trajanja:", error.message);
                                                }
                                            }}
                                            />
                                            </button>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                </div>
                <aside className="planner-sidebar">
                    <section className={`notes-panel ${notesOpen ? "is-open" : ""}`}>
                        <button
                            className="drawer-close"
                            type="button"
                            onClick={closeNotes}
                        >
                            ‹ Back
                        </button>

                        {editingNote ? (
                            <div className="note-editor">
                                <div className="note-editor-bar">
                                    <button
                                        className="note-editor-delete"
                                        type="button"
                                        aria-label="Delete note"
                                        onClick={() => deleteNote(editingNote.id)}
                                    >
                                        🗑
                                    </button>
                                    <button
                                        className="note-editor-done"
                                        type="button"
                                        aria-label="Save note"
                                        onClick={() => finishNote(editingNote.id)}
                                    >
                                        ✔
                                    </button>
                                </div>

                                <textarea
                                    className="note-editor-text"
                                    autoFocus
                                    value={editingNote.text}
                                    placeholder="Write something..."
                                    onChange={(event) =>
                                        changeNote(editingNote.id, event.target.value)
                                    }
                                />
                            </div>
                        ) : (
                            <>
                                <div className="notes-heading">
                                    <div>
                                        <h1 className="header-font">Notes</h1>
                                        <div className="day-date-notes">
                                            <p>{days[getDayOfWeek(new Date())]}</p>
                                            <p>{currentDay}</p>
                                        </div>
                                    </div>

                                    <button
                                        className="notes-new"
                                        type="button"
                                        onClick={startNewNote}
                                    >
                                        ＋ New
                                    </button>
                                </div>

                                <div className="notes-page" onClick={startNewNote}>
                                    {notes.length === 0 && (
                                        <p className="notes-empty">
                                            Tap anywhere to write a note
                                        </p>
                                    )}

                                    {notes.map((note) => {
                                        const { title, preview } = splitNote(note.text);

                                        return (
                                            <button
                                                className="note-item"
                                                type="button"
                                                key={note.id}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setEditingNoteId(note.id);
                                                }}
                                            >
                                                <span className="note-title">{title}</span>
                                                <span className="note-preview">
                                                    {preview || "No additional text"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </section>
                    <section className={`down-right-panel ${rightPanelOpen ? "is-open" : ""}`}>
                            <button
                                className="drawer-close"
                                type="button"
                                onClick={closeRightPanel}
                            >
                                ‹ Back
                            </button>
                            {(selectedItem !== null && deleteSelect == null) ? (        
                                    <div className="edit-description-panel">
                                        <div className="edit-description-container">
                                            <div className="edit-heading">
                                            <p className="edit-item-info">
                                                {days.indexOf(selectedItem.day) !== -1
                                                    ? `${selectedItem.day}, ${getDateForDay(
                                                        startOfWeek,
                                                        days.indexOf(selectedItem.day)
                                                    )}`
                                                    : selectedItem.day}
                                            </p>
                                            <span className="edit-badge">
                                                    {selectedItem.type === "event" ? "Event" : "Task"}
                                            </span>
                                            </div>
                                            <div className="form-row">
                                                <label className="form-label-edit">
                                                    <input
                                                        type="time"
                                                        value={startTime}
                                                        onChange={(event) => setStartTime(event.target.value)}
                                                    />
                                                </label>

                                                <label className="form-label-edit">
                                                    <input
                                                        type="time"
                                                        value={endTime}
                                                        onChange={(event) => setEndTime(event.target.value)}
                                                    />
                                                </label>
                                            </div>
                                            <label className="edit-label" htmlFor="edit-title">
                                                Title
                                            </label>
                                            <input
                                                id="edit-title"
                                                className="edit-input-line"
                                                value={edit}
                                                onChange={(e) => setEdit(e.target.value)}
                                                placeholder= {selectedItem.type === "event" ? "Event name" : "Task name"}
                                            />
                                            <label className="edit-label" htmlFor="edit-description">
                                                Description
                                            </label>
                                            <textarea
                                                id="edit-description"
                                                className="edit-description-input"
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                placeholder="Add details..."
                                            />

                                            <div className="edit-actions">
                                                <button
                                                    className="edit-delete-button"
                                                    type="button"
                                                    onClick={deleteItem}
                                                >
                                                    Delete
                                                </button>

                                                <div className="edit-actions-right">
                                                    <button
                                                        className="edit-cancel-button"
                                                        type="button"
                                                        onClick={cancelEdit}
                                                    >
                                                        Cancel
                                                    </button>

                                                    <button
                                                        className="edit-button"
                                                        type="button"
                                                        onClick={saveEdit}
                                                    >
                                                        Save changes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="upcoming-events-panel">
                                        <span>
                                            <h1 className="header-font">Upcoming Events</h1>
                                        </span>
                                        <div className="upcoming-events-container">
                                            <p></p>
                                        </div>
                                    </div>
                                )}
                    </section>
                </aside>

                <div className="edge-tabs">
                    <button
                        className="edge-tab edge-tab-notes"
                        type="button"
                        onClick={() => setNotesOpen(true)}
                    >
                        Notes
                    </button>
                    <button
                        className="edge-tab edge-tab-upcoming"
                        type="button"
                        onClick={() => setUpcomingOpen(true)}
                    >
                        Upcoming
                    </button>
                </div>
            </div>
            {addingType && selectedCell && (
                <div className="modal-overlay">
                    <div className="task-modal">
                        <div className="modal-heading">
                            <div>
                                <span className="modal-eyebrow">
                                    NEW {addingType === "task" ? "TASK" : "EVENT"}
                                </span>

                                <h2>
                                    {addingType === "task"
                                        ? "Add Task"
                                        : "Add Event"}
                                </h2>
                            </div>

                            <button
                                className="modal-close"
                                onClick ={() => setSelectedCell(null)}
                            >
                                ×
                            </button>
                        </div>

                        <label className="form-label">
                            Name
                            <input
                                autoFocus
                                value={
                                    addingType === "task"
                                        ? taskName
                                        : eventName
                                }
                                onChange={(event) => {
                                    if (addingType === "task") {
                                        setTaskName(event.target.value);
                                    } else {
                                        setEventName(event.target.value);
                                    }
                                }}
                                placeholder={
                                    addingType === "task"
                                        ? "What do you need to do?"
                                        : "What is the event?"
                                }
                            />
                        </label>

                        <div className="form-row">
                            <label className="form-label">
                                Start time
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(event) =>
                                        setStartTime(event.target.value)
                                    }
                                />
                            </label>

                            <label className="form-label">
                                End time
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(event) =>
                                        setEndTime(event.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <div className="selected-day">
                            <span>Day</span>
                            <strong>{selectedCell.day}</strong>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="cancel-mode-button"
                                onClick ={() => setSelectedCell(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={
                                    addingType === "event"
                                        ? "event-button"
                                        : "task-button"
                                }
                                onClick={saveItem}
                            >
                                Save {addingType === "task" ? "Task" : "Event"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}