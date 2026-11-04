"use client";

import { useState } from "react";
import "./planer.css";

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
    const [noteInput, setNoteInput] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [edit, setEdit] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [forDelete, setForDelete] = useState([]);
    const [deleteSelect, setDeleteSelect] = useState(null);
    const [showTransformButton, setShowTransformButton] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resizing, setResizing] = useState(null);

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
    function addNote() {
        if (noteInput.trim() !== "") {
            setNotes([...notes, noteInput]);
            setNoteInput("");
        }
    }
    function selectCell(day, hour) {
        if (!addingType) {
            return;
        }
        setSelectedCell({ day, hour });
        setStartTime(`${String(hour).padStart(2, "0")}:00`);
        setEndTime(`${String(hour + 1).padStart(2, "0")}:00`);
    }

    function saveItem() {
        const name =
            addingType === "task" ? taskName.trim() : eventName.trim();

        if (!name || !selectedCell) {
            return;
        }

        if (minutes(endTime) <= minutes(startTime)) {
            return;
        }

        const newItem = {
            id: crypto.randomUUID(),
            name,
            day: selectedCell.day,
            start: startTime,
            end: endTime,
            type: addingType,
            description: "",
        };
        if (addingType === "task") {
            setTasks((previous) => [...previous, newItem]);
        } else {
            setEvents((previous) => [...previous, newItem]);
        }
        if (addingType === "task") {
            setTaskName("");
        } else {
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

    function getItemStyle(item) {
        const hourHeight = Math.max(12, (window.innerHeight - 170) / 12);
        const minuteHeight = hourHeight / 60;

        return {
            top: `${minutes(item.start) * minuteHeight + 2}px`,
            height: `${Math.max(
                (minutes(item.end) - minutes(item.start)) * minuteHeight - 4,
                18
            )}px`,
        };
    }
    
    function saveEdit() {
        if (selectedItem === null || !edit.trim()) {
            return;
        }

        const updateItem = (item) => {
            if (item.id === selectedItem.id) {
                return {
                    ...item,
                    name: edit.trim(),
                    description: editDescription,
                    start: startTime,
                    end: endTime
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

    function deleteItem() {
        if (selectedItem === null) {
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
    function deleteItems() {
    setTasks((previous) =>
        previous.filter((item) => !forDelete.includes(item))
    );

    setEvents((previous) =>
        previous.filter((item) => !forDelete.includes(item))
    );

    setForDelete([]);
    setDeleteSelect(null);
    setSelectedItem(null);
}

    function cancelEdit() {
        setSelectedItem(null);
    }


    const allItems = [...tasks, ...events];

    return (
        <div className="planner-page">
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
                        onClick={closeModal}
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
                </div>
            </header>
            <div className="planner-layout">
                <div className="planner-scroll">
                <section className="planner-table-wrapper">
                    <div className="schedule">
                        <div className="time-column">
                            <div className="day-header time-header">
                                Time
                            </div>

                            {hours.map((hour) => (
                                <div className="hour-label" key={hour}>
                                    {formatTime(
                                        `${String(hour).padStart(2, "0")}:00`
                                    )}
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
                                                    if(forDelete.includes(item)) {
                                                    setForDelete((previous) =>
                                                    previous.filter((current) => current !== item)
                                                );
                                                }
                                                    else{
                                                        (setForDelete((forDelete) => [...forDelete, item]) && setDeleteSelect(null));
                                                    }
                                                }
                                                }}}
                                                key={item.id}
                                                className={`${item.type === "event" ? "event-block" : "task-block"} ${
                                                deleteSelect && forDelete.includes(item)
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

                                                const hourHeight = Math.max(12, (window.innerHeight - 170) / 12);
                                                const minuteHeight = hourHeight / 60;

                                                const difference = e.clientY - resizing.startY;
                                                const minutesDifference = Math.round(difference / minuteHeight / 5) * 5;

                                                let newEnd = resizing.originalEnd + minutesDifference;

                                                const start = timeToMinutes(resizing.item.start);

                                                if (newEnd < start + 15) {
                                                    newEnd = start + 15;
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
                                                onPointerUp={() => {
                                                setResizing(null);
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
                    <section className="notes-panel">
                        <div>
                        <h1 className="header-font">Add Notes</h1>
                            <div className="day-date-notes">
                            <p>{days[getDayOfWeek(new Date())]}</p>
                            <p>{currentDay}</p>
                            </div>
                        </div>
                        <div className="notes-container">
                            {notes.map((note, index) => (
                                <p key={index}>-{note}</p>
                            ))}
                        </div>
                        <div className="note-input-container">
                        <input value={
                            noteInput ?? ""} 
                            onChange={
                                (e) => setNoteInput(e.target.value)} 
                                className="add-note-text" type="text" placeholder="Add note..." />
                        <button onClick={() => addNote()} className="add-note-button">＋ Add</button>
                        </div>
                    </section>
                    <section className="down-right-panel">
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