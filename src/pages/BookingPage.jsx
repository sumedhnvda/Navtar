import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfToday, isToday, isSameDay } from 'date-fns';
import Navbar from '../components/common/Navbar';
import Modal from '../components/common/Modal';
import './BookingPage.css';

// Generate 24-hour time slots in 30-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Mock booked slots with start and end times
const bookedSlots = [
  { 
    date: new Date(), 
    startTime: '09:00', 
    endTime: '10:30'
  },
  { 
    date: new Date(), 
    startTime: '14:00', 
    endTime: '15:30'
  },
  { 
    date: addDays(new Date(), 1), 
    startTime: '13:00', 
    endTime: '14:30'
  }
];

function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const navigate = useNavigate();

  // Generate date options for next 7 days
  const dateOptions = Array.from({ length: 7 }, (_, index) => {
    return addDays(startOfToday(), index);
  });

  // Check if a time slot is within any booked period
  const isTimeBooked = (date, time) => {
    return bookedSlots.some(slot => {
      if (!isSameDay(slot.date, date)) return false;
      return time >= slot.startTime && time < slot.endTime;
    });
  };

  // Check if selected time range overlaps with any booked slot
  const isTimeRangeValid = (startTime, endTime) => {
    if (!startTime || !endTime || startTime >= endTime) return false;
    
    return !bookedSlots.some(slot => {
      if (!isSameDay(slot.date, selectedDate)) return false;
      return (startTime < slot.endTime && endTime > slot.startTime);
    });
  };

  const handleTimeSelect = (time, isStart) => {
    if (isStart) {
      setSelectedStartTime(time);
      setSelectedEndTime(null);
    } else {
      if (!selectedStartTime || time <= selectedStartTime) return;
      
      if (isTimeRangeValid(selectedStartTime, time)) {
        setSelectedEndTime(time);
        setModalType('confirm');
        setIsModalOpen(true);
      } else {
        setModalType('booked');
        setIsModalOpen(true);
      }
    }
  };

  const handleConfirmBooking = () => {
    if (isToday(selectedDate)) {
      navigate('/consultation');
    } else {
      console.log('Booking confirmed for:', {
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedStartTime,
        endTime: selectedEndTime
      });
      setIsModalOpen(false);
      alert(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
    }
  };

  return (
    <div className="booking-page">
      <Navbar />
      
      <div className="booking-container container">
        <div className="booking-header">
          <h1>Book Navatar Robot</h1>
          <p className="booking-subtitle">
            Select a date and time range to schedule your robot-assisted patient consultations
          </p>
        </div>
        
        <div className="booking-content">
          <div className="date-selector card">
            <h3>Select Date</h3>
            <div className="date-options">
              {dateOptions.map((date, index) => (
                <button
                  key={index}
                  className={`date-option ${isSameDay(date, selectedDate) ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="date-weekday">{format(date, 'EEE')}</div>
                  <div className="date-day">{format(date, 'd')}</div>
                  <div className="date-month">{format(date, 'MMM')}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="time-selector card">
            <h3>Select Time Range</h3>
            <div className="time-range-instructions">
              {!selectedStartTime ? 
                "First, select a start time" : 
                !selectedEndTime ? 
                "Now, select an end time" : 
                "Time range selected"}
            </div>
            <div className="time-options">
              {timeSlots.map((time, index) => {
                const booked = isTimeBooked(selectedDate, time);
                const isSelected = time === selectedStartTime || time === selectedEndTime;
                const isInRange = selectedStartTime && selectedEndTime && 
                                time > selectedStartTime && time < selectedEndTime;
                
                return (
                  <button
                    key={index}
                    className={`time-option ${booked ? 'booked' : ''} 
                              ${isSelected ? 'selected' : ''} 
                              ${isInRange ? 'in-range' : ''}`}
                    onClick={() => handleTimeSelect(time, !selectedStartTime)}
                    disabled={booked}
                  >
                    {time}
                    {booked && <span className="booked-indicator">Booked</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Booked Slot Modal */}
      <Modal
        isOpen={isModalOpen && modalType === 'booked'}
        onClose={() => setIsModalOpen(false)}
        title="Time Slot Already Booked"
      >
        <p>This time slot is already booked. Please select another time.</p>
        <div className="modal-footer">
          <button 
            className="btn btn-primary" 
            onClick={() => setIsModalOpen(false)}
          >
            OK
          </button>
        </div>
      </Modal>
      
      {/* Confirm Booking Modal */}
      <Modal
        isOpen={isModalOpen && modalType === 'confirm'}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Booking"
      >
        <p>
          You are about to book the Navatar robot for:
          <br /><br />
          <strong>Date:</strong> {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
          <br />
          <strong>Time:</strong> {selectedStartTime} - {selectedEndTime}
        </p>
        
        {isToday(selectedDate) && (
          <div className="immediate-notice">
            Since you selected today, you'll be immediately connected to the robot for consultation.
          </div>
        )}
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsModalOpen(false)}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirmBooking}
          >
            {isToday(selectedDate) ? 'Start Now' : 'Confirm Booking'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default BookingPage;