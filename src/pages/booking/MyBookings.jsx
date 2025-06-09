import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, set } from 'date-fns';

function MyBookings({ myBookedSlots, onSelectBookingForCancellation }) {
    const navigate = useNavigate();
    const now = new Date();
    const [showReminder, setShowReminder] = useState(false);
    const [reminder, setReminder] = useState('');
    const [notifiedIntervals, setNotifiedIntervals] = useState({});

    // Convert and sort upcoming bookings
    const upcomingBookings = myBookedSlots
        .map(slot => ({ ...slot, date: new Date(slot.date) }))
        .filter(slot => {
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            const slotEnd = new Date(slot.date);
            slotEnd.setHours(endHour, endMinute, 0, 0);
            return slotEnd > now;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime));

    // Check for reminders
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkReminders = () => {
            const now = new Date();
            let foundReminder = null;
            const newNotifiedIntervals = { ...notifiedIntervals };

            if (upcomingBookings.length > 0) {
                const slot = upcomingBookings[0];
                const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                const slotStart = new Date(slot.date);
                slotStart.setHours(startHour, startMinute, 0, 0);

                const diffInMinutes = (slotStart - now) / 60000 + 0.8;
                console.log(`Time until next booking: ${Math.floor(diffInMinutes)} minutes`);
                const slotId = slot.startTime + slot.date;

                if (diffInMinutes >= 0 && diffInMinutes <= 30 && (Math.floor(diffInMinutes) == 0 || Math.floor(diffInMinutes) == 1) || (Math.floor(diffInMinutes) == 5) || (Math.floor(diffInMinutes) == 10) || (Math.floor(diffInMinutes) == 30)) {
                    const interval = [1, 5, 10, 30].find(i => Math.abs(diffInMinutes - i) < 0.8);
                    if (interval) {
                        if (!newNotifiedIntervals[slotId] || !newNotifiedIntervals[slotId].includes(interval)) {
                            if (interval === 1 && diffInMinutes == 1) {
                                foundReminder = Math.floor(diffInMinutes) > 0 ? `Your session with Navatar starts in ${Math.floor(diffInMinutes)} minute! Almost time!` : 'Your session with Navatar started!';
                            } else {
                                foundReminder = Math.floor(diffInMinutes) > 0 ? `Your session with Navatar starts in ${Math.floor(diffInMinutes)} minutes! Be Ready!` : 'Your session with Navatar started!';
                            }

                            newNotifiedIntervals[slotId] = [...(newNotifiedIntervals[slotId] || []), interval];
                        }
                    }
                }
            }

            setShowReminder(foundReminder !== null);
            if (foundReminder) {
                setReminder(foundReminder);
                // Show browser notification if permission is granted
                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification(foundReminder);
                    }
                }
            }
            setNotifiedIntervals(newNotifiedIntervals);
        };


        checkReminders();
        // Check reminders every minute
        const interval = setInterval(checkReminders, 30000);
        return () => clearInterval(interval);
    }, [myBookedSlots]);

    if (myBookedSlots.length === 0 || upcomingBookings.length === 0) {
        return (
            <div className="my-bookings-list">
                <h1>My Bookings</h1>
                <p className="no-bookings">No bookings found.</p>
            </div>
        );
    }

    return (
        <div className="my-bookings-list">
            <h1>My Bookings</h1>

            {showReminder && (
                <div className="popup reminder">
                    <span> {reminder} </span>
                    <button className="close-reminder" onClick={() => setShowReminder(false)}>×</button>
                </div>
            )}

            <ul>
                {upcomingBookings.map((slot, index) => {
                    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                    const slotStart = new Date(slot.date);
                    slotStart.setHours(startHour, startMinute, 0, 0);

                    const [endHour, endMinute] = slot.endTime.split(':').map(Number);
                    const slotEnd = new Date(slot.date);
                    slotEnd.setHours(endHour, endMinute, 0, 0);

                    const isOngoing = now >= slotStart && now < slotEnd;

                    return (
                        <li key={index} className={`my-booking-item ${isOngoing ? 'ongoing' : ''}`} style={{
                            '--delay': `${(index + 1)}s`
                        }}>
                            <span>{format(slot.date, 'MMMM d, yyyy')}</span>
                            <span>{slot.startTime}</span> - <span>{slot.endTime}</span>
                            <div className="booking-actions">
                                <button
                                    className="btn btn-success"
                                    onClick={() => navigate('/consultation')}
                                    style={{ visibility: isOngoing ? "visible" : "hidden" }}
                                >
                                    Start
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => onSelectBookingForCancellation(slot)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default MyBookings;
