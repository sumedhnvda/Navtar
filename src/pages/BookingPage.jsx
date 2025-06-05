import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isBefore, startOfDay, parse, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import './BookingPage.css';

function BookingPage() {
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [myBookedSlots, setMyBookedSlots] = useState([]);
  const [message, setMessage] = useState('');
  const [popup, setPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const navigate = useNavigate();
  const delay = 3000;

  useEffect(() => {
    if (timeOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [timeOpen, isModalOpen]);

  const calendar = document.querySelector(".calendar");

  document.addEventListener("mousemove", (e) => {
    if (calendar) {
      calendar.style.setProperty("--x", e.x + "px");
      calendar.style.setProperty("--y", e.y + "px");
    }
  });

  // Fetch booked slots from JSON
  useEffect(() => {
    fetch('../bookedSlots.json')
      .then(res => res.json())
      .then(data => {
        const parsedSlots = data.map(slot => ({
          ...slot,
          date: parseISO(slot.date),
        }));

        const localStorageData = JSON.parse(localStorage.getItem('bookedSlots')) || [];

        const parsedLocalSlots = localStorageData.map(slot => ({
          ...slot,
          date: new Date(slot.date),
        }));

        setBookedSlots(parsedSlots);
        setMyBookedSlots(parsedLocalSlots);
      })
      .catch(error => console.error('Error fetching booked slots:', error));
  }, []);

  useEffect(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setCalendarDays(eachDayOfInterval({ start, end }));
  }, []);

  const isMyBookedRange = (startTime, endTime) => {
    if (!startTime || !endTime || !selectedDate) return false;

    const selectedStart = new Date(selectedDate);
    const [sh, sm] = startTime.split(':').map(Number);
    selectedStart.setHours(sh, sm, 0, 0);

    const selectedEnd = new Date(selectedDate);
    const [eh, em] = endTime.split(':').map(Number);
    selectedEnd.setHours(eh, em, 0, 0);
    return myBookedSlots.some(slot => {
      if (!isSameDay(slot.date, selectedDate)) return false;

      const slotStart = new Date(slot.date);
      const [slotSh, slotSm] = slot.startTime.split(':').map(Number);
      slotStart.setHours(slotSh, slotSm, 0, 0);

      const slotEnd = new Date(slot.date);
      const [slotEh, slotEm] = slot.endTime.split(':').map(Number);
      slotEnd.setHours(slotEh, slotEm, 0, 0);
      setMessage("This slot is already booked.");
      return selectedStart < slotEnd && selectedEnd > slotStart;
    });
  };

  const isTimeRangeValid = (startTime, endTime) => {
    const newStart = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const newEnd = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    if (isSameDay(Date.now(), selectedDate) && isBefore(newStart, new Date())) {
      setMessage("You cannot book a slot in the past.");
      return false;
    }

    return !bookedSlots.some(slot => {
      const slotStart = parse(`${format(slot.date, 'yyyy-MM-dd')} ${slot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const slotEnd = parse(`${format(slot.date, 'yyyy-MM-dd')} ${slot.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
      setMessage("This slot is already booked.");
      return isSameDay(slot.date, selectedDate) && newStart < slotEnd && newEnd > slotStart;
    });
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setTimeOpen(true);
  }

  const handleConfirm = () => {
    const newBooking = {
      date: selectedDate.toISOString(),
      startTime: selectedStartTime,
      endTime: selectedEndTime
    };

    const existing = JSON.parse(localStorage.getItem('bookedSlots')) || [];
    const updatedBookings = [...existing, newBooking];
    localStorage.setItem('bookedSlots', JSON.stringify(updatedBookings));

    setMyBookedSlots(prevSlots => [
      ...prevSlots,
      {
        ...newBooking,
        date: selectedDate,
      }
    ]);
    setPopupMessage(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
    setPopup(true);
    setTimeout(() => setPopup(false), delay);

    // alert(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
    setIsModalOpen(false);
  };


  const handleDelete = () => {
    const updatedBookings = myBookedSlots.filter(
      slot => !(isSameDay(slot.date, selectedDate) && slot.startTime === selectedStartTime)
    );
    localStorage.setItem('bookedSlots', JSON.stringify(updatedBookings));
    setMyBookedSlots(updatedBookings);

    setPopupMessage(`Booking cancelled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedStartTime}`);
    setPopup(true);
    setTimeout(() => setPopup(false), delay);

    // alert(`Booking cancelled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedStartTime}`);
    setIsModalOpen(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setTimeOpen(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="booking-page">
        <div className="booking-container" >
          <h1>Book Navatar Robot</h1>
          <p>Select a date from the dates below:</p>

          <div className="calendar">
            {calendarDays.map((day, index) => {
              const isPast = isBefore(day, startOfDay(new Date()));
              return (
                <button
                  key={index}
                  className={`calendar-day ${isSameDay(day, selectedDate) ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => !isPast && handleDateClick(day)}
                  disabled={isPast}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {selectedDate && timeOpen && (
            <div className="modal-overlay" onClick={handleOverlayClick}>
              <div className="time-container">
                <p>Select start and end time:</p>
                <div className="time-inputs">
                  <label>
                    Start Time:
                    <input
                      type="time"
                      value={selectedStartTime}
                      onChange={(e) => setSelectedStartTime(e.target.value)}
                      min="00:00"
                      max="23:59"
                      step="300" required
                    />
                  </label>
                  <label>
                    End Time:
                    <input
                      type="time"
                      value={selectedEndTime}
                      onChange={(e) => setSelectedEndTime(e.target.value)}
                      min={selectedStartTime || "00:00"}
                      max="23:59"
                      step="300" required
                    />
                  </label>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-danger" onClick={() => setTimeOpen(false)}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!isTimeRangeValid(selectedStartTime, selectedEndTime) || isMyBookedRange(selectedStartTime, selectedEndTime)) {
                        setModalType('booked');
                        setIsModalOpen(true);
                      } else {
                        setModalType('confirm');
                        setIsModalOpen(true);
                      }
                    }}
                    disabled={!selectedStartTime || !selectedEndTime || selectedStartTime >= selectedEndTime}
                  >
                    Check Availability
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Confirmation or Error */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={
              modalType === 'confirm' ? 'Confirm Booking' :
                modalType === 'delete' ? 'Cancel Booking' :
                  'Slot Unavailable'
            }>
            {modalType === 'confirm' ? (

              < >
                <p>You selected:</p>
                <strong>Date:</strong> {format(selectedDate, 'MMMM d, yyyy')}<br />
                <strong>Time:</strong> {selectedStartTime} - {selectedEndTime}
                <div className="modal-footer">
                  <button className="btn btn-danger" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleConfirm}>
                    {"Confirm"}
                  </button>
                </div>
              </>
            ) : modalType === 'delete' ? (
              <>
                <p>You have already booked this slot.</p>
                <strong>Date:</strong> {format(selectedDate, 'MMMM d, yyyy')}<br />
                <strong>Time:</strong> {selectedStartTime}
                <div className="modal-footer">
                  <button className="btn btn-danger" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </>
            ) :
              (
                <>
                  <p>{message}</p>
                  <div className="modal-footer">
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>OK</button>
                  </div>
                </>
              )}
          </Modal>
        </div>
        <div className="my-bookings-list">
          <h1>My Bookings</h1>
          <ul>
            {myBookedSlots.length > 0 ? (
              (() => {
                const now = new Date();
                const filteredSlots = myBookedSlots.filter(slot => {
                  const [hour, minute] = slot.startTime.split(':').map(Number);
                  const [endhour, endminute] = slot.endTime.split(':').map(Number);
                  const slotStart = new Date(slot.date);
                  slotStart.setHours(hour, minute, 0, 0);

                  const slotEnd = new Date(slot.date);
                  slotEnd.setHours(endhour, endminute, 0, 0);
                  return slotEnd > now;
                });
                if (filteredSlots.length === 0) {
                  return <li className="no-bookings">No upcoming bookings.</li>;
                }
                return filteredSlots
                  .sort((a, b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime))
                  .map((slot, index) => {
                    const now = new Date();
                    const [hour, minute] = slot.startTime.split(':').map(Number);
                    const [endhour, endminute] = slot.endTime.split(':').map(Number);
                    const slotStart = new Date(slot.date);
                    slotStart.setHours(hour, minute, 0, 0);

                    const slotEnd = new Date(slot.date);
                    slotEnd.setHours(endhour, endminute, 0, 0);

                    const isOngoing = now >= slotStart && now < slotEnd;

                    return (
                      <li key={index} className={`my-booking-item ${isOngoing ? 'ongoing' : ''}`}>
                        <span>{format(slot.date, 'MMMM d, yyyy')}</span>
                        <span>{slot.startTime}</span>-<span>{slot.endTime}</span>
                        <div className="booking-actions">
                          <button className="btn btn-success" onClick={() => navigate('/consultation')} style={{ visibility: !isOngoing ? "hidden" : "visible" }}>Start</button>
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              setSelectedDate(slot.date);
                              setSelectedStartTime(slot.startTime);
                              setModalType('delete');
                              setIsModalOpen(true);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    )
                  });
              })()
            ) : (
              <li className="no-bookings">No bookings found.</li>
            )}
          </ul>
        </div>
      </div >
      {popup && (
        <div className='popup'>
          <button className={`btn ${modalType}`} onClick={() => setPopup(false)}>
            {popupMessage}
          </button>
          <div className={`popup-indicator ${modalType}`}></div>
        </div>
      )}
    </>

  );
}

export default BookingPage;
