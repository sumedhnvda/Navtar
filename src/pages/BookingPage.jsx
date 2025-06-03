import { useState, useEffect } from 'react';
import { isBefore, isAfter, parse, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import './BookingPage.css';

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
        // Local slots only store startTime (no endTime)
        const parsedLocalSlots = localStorageData.map(slot => ({
          ...slot,
          date: new Date(slot.date),
          // only startTime here, no endTime
        }));

        // Combine both arrays
        const combinedSlots = [...parsedSlots, ...parsedLocalSlots];

        setBookedSlots(combinedSlots);
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
    if (!end || !isTimeRangeValid(start, end)) {
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
    setBookedSlots(prevSlots => [
      ...prevSlots,
      {
        ...newBooking,
        date: selectedDate,
      }
    ]);
    alert(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
    setIsModalOpen(false);
  };



  return (
    <div className="booking-page">
      <Navbar />
      <div className="booking-container container">

        <h1>Book Navatar Robot</h1>
        <p>Select a date from the calendar below:</p>

        <div className="calendar">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              className={`calendar-day ${isSameDay(day, selectedDate) ? 'selected' : ''}`}
              onClick={() => handleDateClick(day)}
            >
              {format(day, 'd')}
            </button>
          ))}
        </div>


        {selectedDate && timeOpen && (
          <div className="time-container">
            <p>Select time</p>
            <div className="time-options">
              <button className='close' onClick={() => setTimeOpen(false)}>X</button>
              {timeSlots.map((time, index) => {
                const booked = isTimeBooked(selectedDate, time);
                const pastTime = isPastTime(selectedDate, time);
                const isSelected = time === selectedStartTime || time === selectedEndTime;
                const isInRange = selectedStartTime && selectedEndTime &&
                  time > selectedStartTime && time < selectedEndTime;

                return (
                  <button
                    key={index}
                    className={`time-option ${booked ? 'booked' : ''} 
                  ${isSelected ? 'selected' : ''} 
                  ${isInRange ? 'in-range' : ''}`}
                    onClick={() => handleTimeClick(time, !selectedStartTime)}
                    disabled={booked || pastTime}
                  >
                    {time}
                    {booked && <span className="booked-indicator">Booked</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal for Confirmation or Error */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            modalType === 'confirm' ? 'Confirm Booking' : 'Slot Unavailable'
          }>
          {modalType === 'confirm' ? (
            <>
              <p>You selected:</p>
              <strong>Date:</strong> {format(selectedDate, 'MMMM d, yyyy')}<br />
              <strong>Time:</strong> {selectedStartTime} - {selectedEndTime}
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleConfirm}>
                  {"Confirm"}
                </button>

              </div>
            </>
          ) : (
            <>
              <p>This slot is already booked. Please choose another one.</p>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>OK</button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default BookingPage;
