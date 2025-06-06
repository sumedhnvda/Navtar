import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

function MyBookings({ myBookedSlots, onSelectBookingForCancellation }) {
    const navigate = useNavigate();
    const now = new Date();

    if (myBookedSlots.length === 0) {
        return (
            <div className="my-bookings-list">
                <h1>My Bookings</h1>
                <p className="no-bookings">No bookings found.</p>
            </div>
        );
    }

    const upcomingBookings = myBookedSlots
        .map(slot => ({ ...slot, date: new Date(slot.date) }))
        .filter(slot => {
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            const slotEnd = new Date(slot.date);
            slotEnd.setHours(endHour, endMinute, 0, 0);
            return slotEnd > now;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime));

    if (upcomingBookings.length === 0) {
        return (
            <div className="my-bookings-list">
                <h1>My Bookings</h1>
                <p className="no-bookings">No upcoming bookings.</p>
            </div>
        );
    }

    return (
        <div className="my-bookings-list">
            <h1>My Bookings</h1>
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
                        <li key={index} className={`my-booking-item ${isOngoing ? 'ongoing' : ''}`}>
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
