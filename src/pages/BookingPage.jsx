import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isBefore, startOfDay, parse, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, set } from 'date-fns';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import './BookingPage.css';
import { is } from 'date-fns/locale';

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

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
  const navigate = useNavigate();

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
        // Parse fetched slots (date strings to Date objects)
        const parsedSlots = data.map(slot => ({
          ...slot,
          date: parseISO(slot.date),
        }));

        // Get localStorage bookings
        const localStorageData = JSON.parse(localStorage.getItem('bookedSlots')) || [];

        // Parse localStorage slots, date string to Date object
        // Local slots only store startTime 
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

  const isTimeBooked = (date, time) => {
    return bookedSlots.some(slot =>
      isSameDay(slot.date, date) &&
      time == slot.startTime
    );
  };

  const isMyBooked = (date, time) => {
    return myBookedSlots.some(slot =>
      isSameDay(slot.date, date) &&
      time == slot.startTime
    );
  };

  const isPastTime = (date, time) => {
    const now = new Date();

    const [hour, minute] = time.split(':').map(Number);
    const slotTime = new Date(date);
    slotTime.setHours(hour, minute, 0, 0);

    return isBefore(slotTime, now);
  };


  const isTimeRangeValid = (startTime, endTime) => {
    return !bookedSlots.some(slot =>
      isSameDay(slot.date, selectedDate) &&
      startTime < slot.endTime &&
      endTime > slot.startTime
    );
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setTimeOpen(true);
  }

  const handleTimeClick = (start) => {
    const index = timeSlots.indexOf(start);
    let end = timeSlots[index + 1];
    if (!end && start === "23:30") {
      end = "00:00";
    }
    if (isMyBooked(selectedDate, start)) {
      setSelectedStartTime(start);
      setModalType('delete');
    } else if (!end || !isTimeRangeValid(start, end)) {
      setModalType('booked');
    } else {
      setSelectedStartTime(start);
      setSelectedEndTime(end);
      setModalType('confirm');
    }

    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    const newBooking = {
      date: selectedDate.toISOString(),
      startTime: selectedStartTime,
    };

    // Retrieve existing bookings
    const existing = JSON.parse(localStorage.getItem('bookedSlots')) || [];

    // Add new booking
    const updatedBookings = [...existing, newBooking];

    // Save back
    localStorage.setItem('bookedSlots', JSON.stringify(updatedBookings));

    setMyBookedSlots(prevSlots => [
      ...prevSlots,
      {
        ...newBooking,
        date: selectedDate,
      }
    ]);
    alert(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    const updatedBookings = myBookedSlots.filter(
      slot => !(isSameDay(slot.date, selectedDate) && slot.startTime === selectedStartTime)
    );
    localStorage.setItem('bookedSlots', JSON.stringify(updatedBookings));
    setMyBookedSlots(updatedBookings);
    alert(`Booking cancelled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedStartTime}`);
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
                <p>Please select a time slot to book</p>
                <div className="time-options">
                  <button className='close' onClick={() => setTimeOpen(false)}>X</button>
                  {timeSlots.map((time, index) => {
                    const booked = isTimeBooked(selectedDate, time);
                    const mybooked = isMyBooked(selectedDate, time);
                    const pastTime = isPastTime(selectedDate, time);
                    const isSelected = time === selectedStartTime || time === selectedEndTime;
                    const isInRange = selectedStartTime && selectedEndTime &&
                      time > selectedStartTime && time < selectedEndTime;

                    return (
                      <button
                        key={index}
                        className={`time-option ${booked ? 'booked' : ''} ${mybooked ? 'my-booked' : ''} 
                  ${isSelected ? 'selected' : ''} 
                  ${isInRange ? 'in-range' : ''}`}
                        onClick={() => handleTimeClick(time, !selectedStartTime)}
                        disabled={booked || pastTime}
                      >
                        {time}
                        {(booked || mybooked) && <span className="booked-indicator">Booked</span>}
                      </button>
                    );
                  })}
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
                  <p>This slot is already booked. Please choose another one.</p>
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
              myBookedSlots.filter(slot => {
                const now = new Date();
                const [hour, minute] = slot.startTime.split(':').map(Number);
                const slotStart = new Date(slot.date);
                slotStart.setHours(hour, minute, 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + 30);

                return slotEnd > now;
              }).sort((a, b) => new Date(a.date) - new Date(b.date) || a.startTime.localeCompare(b.startTime))
                .map((slot, index) => {
                  const now = new Date();
                  const [hour, minute] = slot.startTime.split(':').map(Number);
                  const slotStart = new Date(slot.date);
                  slotStart.setHours(hour, minute, 0, 0);

                  const slotEnd = new Date(slotStart);
                  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

                  const isOngoing = now >= slotStart && now < slotEnd;

                  return (
                    <li key={index} className="my-booking-item">
                      <span>{format(slot.date, 'MMMM d, yyyy')}</span>
                      <span>{slot.startTime}</span>
                      <div className="booking-actions">
                        {isOngoing && <button className="btn btn-success" onClick={() => navigate('/consultation')}>Start</button>}
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            setSelectedDate(slot.date);
                            setSelectedStartTime(slot.startTime);
                            handleDelete();
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  )
                })) : (
              <li className="no-bookings">No bookings found.</li>
            )}
          </ul>
        </div>
      </div >
    </>

  );
}

export default BookingPage;
