import { useState, useEffect } from 'react';
import {
  isBefore, parse, format,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO
} from 'date-fns';

import { useUser } from '@clerk/clerk-react';
import { getBookings, createBooking, deleteBooking } from '../../context/api';

import Navbar from '../../components/common/Navbar';
import CalendarGrid from './CalendarGrid';
import TimeSelectorModal from './TimeSelectorModal';
import BookingActionModal from './BookingActionModal';
import MyBookings from './MyBookings';
import NotificationPopup from './NotificationPopup';
import './BookingPage.css';

function BookingPage() {
  const { user, isLoaded } = useUser();

  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');

  const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState('');

  const [bookedSlots, setBookedSlots] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [popup, setPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('');

  const delay = 3000;

  useEffect(() => {
    const isAnyModalOpen = isTimeSelectorOpen || isActionModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isTimeSelectorOpen, isActionModalOpen]);

  useEffect(() => {
    getBookings()
      .then(data => setBookedSlots(data))
      .catch(() => {
        setPopupMessage('Failed to load bookings.');
        setPopupType('error');
        setPopup(true);
        setTimeout(() => setPopup(false), delay);
      });
  }, []);

  useEffect(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setCalendarDays(eachDayOfInterval({ start, end }));
  }, []);

  if (!isLoaded) return <div>Loading...</div>;
  if (!user) return <div>User not authenticated</div>;

  const myBookings = bookedSlots.filter(slot => {
    if (!slot.user_id) return false;
    let userObj;
    try {
      userObj = JSON.parse(slot.user_id);
    } catch {
      return false;
    }
    return userObj.id === user.id;
  });

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setSelectedStartTime('');
    setSelectedEndTime('');
    setIsTimeSelectorOpen(true);
  };

  const isSlotOverlapping = (date, startTime, endTime, slotsList) => {
    if (!startTime || !endTime || !date) return false;
    const newBookingStartDateTime = parse(`${format(date, 'yyyy-MM-dd')} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const newBookingEndDateTime = parse(`${format(date, 'yyyy-MM-dd')} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
    return slotsList.some(slot => {
      if (!isSameDay(parseISO(slot.date), date)) return false;
      const existingSlotStartDateTime = parse(`${format(parseISO(slot.date), 'yyyy-MM-dd')} ${slot.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
      const existingSlotEndDateTime = parse(`${format(parseISO(slot.date), 'yyyy-MM-dd')} ${slot.end_time}`, 'yyyy-MM-dd HH:mm', new Date());
      return newBookingStartDateTime < existingSlotEndDateTime && newBookingEndDateTime > existingSlotStartDateTime;
    });
  };

  const handleCheckAvailability = () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setPopupMessage('Please select a date and both start and end times.');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      return;
    }
    const newStart = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
    if (isSameDay(Date.now(), selectedDate) && isBefore(newStart, new Date())) {
      setMessage("You cannot book a slot in the past.");
      setActionModalType('booked');
      setIsActionModalOpen(true);
      setIsTimeSelectorOpen(false);
      return;
    }
    if (isSlotOverlapping(selectedDate, selectedStartTime, selectedEndTime, bookedSlots)) {
      setMessage("This slot is already booked.");
      setActionModalType('booked');
      setIsActionModalOpen(true);
      setIsTimeSelectorOpen(false);
      return;
    }
    setActionModalType('confirm');
    setIsActionModalOpen(true);
    setIsTimeSelectorOpen(false);
  };

  const handleConfirmBooking = async () => {
    setConfirmLoading(true);

    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setPopupMessage('Please select a date and both start and end times.');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      return;
    }

    const newBooking = {
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedStartTime,
      end_time: selectedEndTime,
      user_id: JSON.stringify(user)
    };

    try {
      await createBooking(newBooking);
      setPopupMessage(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
      setPopupType('success');
      getBookings().then(setBookedSlots);
    } catch {
      setPopupMessage('Failed to save booking. Please try again.');
      setPopupType('error');
    }

    setPopup(true);
    setTimeout(() => setPopup(false), delay);
    setIsActionModalOpen(false);
    setConfirmLoading(false);
  };

  const handleSelectBookingForCancellation = (slotToCancel) => {
    const date = new Date(slotToCancel?.date);
    if (isNaN(date.getTime())) return;

    setSelectedDate(date);
    setSelectedStartTime(slotToCancel.start_time);
    setSelectedEndTime(slotToCancel.end_time);
    setActionModalType('delete');
    setIsActionModalOpen(true);
  };

  const handleDeleteBooking = async () => {
    setDeleteLoading(true);

    const bookingToDelete = bookedSlots.find(slot =>
      slot.date === format(selectedDate, 'yyyy-MM-dd') &&
      slot.start_time === selectedStartTime &&
      slot.end_time === selectedEndTime
    );

    if (!bookingToDelete) {
      setPopupMessage('Booking not found or already deleted.');
      setPopupType('error');
      setPopup(true);
      setTimeout(() => setPopup(false), delay);
      setDeleteLoading(false);
      return;
    }

    try {
      await deleteBooking(bookingToDelete.id);
      setPopupMessage(`Booking cancelled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedStartTime}`);
      setPopupType('success');
      getBookings().then(setBookedSlots);
    } catch {
      setPopupMessage('Failed to update bookings. Please try again.');
      setPopupType('error');
    }

    setPopup(true);
    setTimeout(() => setPopup(false), delay);
    setIsActionModalOpen(false);
    setDeleteLoading(false);
  };

  const handleTimeSelectorOverlayClick = (e) => {
    if (e.target === e.currentTarget) setIsTimeSelectorOpen(false);
  };

  return (
    <>
      <Navbar />
      <div className="booking-page">
        <div className="booking-container">
          <h1>Book Navatar Robot</h1>
          <p>Select a date from the dates below:</p>
          <CalendarGrid
            calendarDays={calendarDays}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
          />
        </div>

        <MyBookings
          bookings={myBookings}
          onSelectBookingForCancellation={handleSelectBookingForCancellation}
        />
      </div>

      <TimeSelectorModal
        isOpen={isTimeSelectorOpen}
        onClose={() => setIsTimeSelectorOpen(false)}
        selectedDate={selectedDate}
        selectedStartTime={selectedStartTime}
        onStartTimeChange={setSelectedStartTime}
        selectedEndTime={selectedEndTime}
        onEndTimeChange={setSelectedEndTime}
        onCheckAvailability={handleCheckAvailability}
        onOverlayClick={handleTimeSelectorOverlayClick}
      />

      <BookingActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        modalType={actionModalType}
        selectedDate={selectedDate}
        selectedStartTime={selectedStartTime}
        selectedEndTime={selectedEndTime}
        message={message}
        onConfirm={handleConfirmBooking}
        onDelete={handleDeleteBooking}
        confirmLoading={confirmLoading}
        deleteLoading={deleteLoading}
      />

      <NotificationPopup
        isOpen={popup}
        message={popupMessage}
        type={popupType}
        onClose={() => setPopup(false)}
      />
    </>
  );
}

export default BookingPage;
