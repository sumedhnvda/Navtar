import { useState, useEffect } from 'react';
import {
    isBefore, parse, format,
    startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, parseISO
} from 'date-fns';

import Navbar from '../../components/common/Navbar';
import CalendarGrid from './CalendarGrid';
import TimeSelectorModal from './TimeSelectorModal';
import BookingActionModal from './BookingActionModal';
import MyBookings from './MyBookings';
import NotificationPopup from './NotificationPopup';
import './BookingPage.css';

function BookingPage() {
    const [calendarDays, setCalendarDays] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedStartTime, setSelectedStartTime] = useState('');
    const [selectedEndTime, setSelectedEndTime] = useState('');

    const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionModalType, setActionModalType] = useState('');

    const [bookedSlots, setBookedSlots] = useState([]);
    const [myBookedSlots, setMyBookedSlots] = useState([]);

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
        fetch('../bookedSlots.json')
            .then(res => res.json())
            .then(data => {
                const parsedSlots = data.map(slot => ({
                    ...slot,
                    date: parseISO(slot.date),
                }));
                setBookedSlots(parsedSlots);
            })
            .catch(error => console.error('Error fetching global booked slots:', error));

        const localStorageData = JSON.parse(localStorage.getItem('bookedSlots')) || [];
        const parsedLocalSlots = localStorageData.map(slot => ({
            ...slot,
            date: new Date(slot.date),
        }));
        setMyBookedSlots(parsedLocalSlots);
    }, []);

    useEffect(() => {
        const start = startOfMonth(new Date());
        const end = endOfMonth(new Date());
        setCalendarDays(eachDayOfInterval({ start, end }));
    }, []);

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
            if (!isSameDay(new Date(slot.date), date)) return false;
            const existingSlotStartDateTime = parse(`${format(new Date(slot.date), 'yyyy-MM-dd')} ${slot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const existingSlotEndDateTime = parse(`${format(new Date(slot.date), 'yyyy-MM-dd')} ${slot.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            return newBookingStartDateTime < existingSlotEndDateTime && newBookingEndDateTime > existingSlotStartDateTime;
        });
    };

    const handleCheckAvailability = () => {
        const newStart = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedStartTime}`, 'yyyy-MM-dd HH:mm', new Date());
        if (isSameDay(Date.now(), selectedDate) && isBefore(newStart, new Date())) {
            setMessage("You cannot book a slot in the past.");
            setActionModalType('booked');
            setIsActionModalOpen(true);
            setIsTimeSelectorOpen(false);
            return;
        }
        if (isSlotOverlapping(selectedDate, selectedStartTime, selectedEndTime, bookedSlots)) {
            setMessage("This slot is already booked by someone else.");
            setActionModalType('booked');
            setIsActionModalOpen(true);
            setIsTimeSelectorOpen(false);
            return;
        }
        if (isSlotOverlapping(selectedDate, selectedStartTime, selectedEndTime, myBookedSlots)) {
            setMessage("You have already booked a slot that overlaps with this time.");
            setActionModalType('booked');
            setIsActionModalOpen(true);
            setIsTimeSelectorOpen(false);
            return;
        }
        setActionModalType('confirm');
        setIsActionModalOpen(true);
        setIsTimeSelectorOpen(false);
    };

    const handleConfirmBooking = () => {
        if (!selectedDate || !selectedStartTime || !selectedEndTime) {
            setPopupMessage('Please select a date and both start and end times.');
            setPopupType('error');
            setPopup(true);
            setTimeout(() => setPopup(false), delay);
            return;
        }

        const newBooking = {
            date: selectedDate.toISOString(),
            startTime: selectedStartTime,
            endTime: selectedEndTime
        };

        // Prevent duplicate booking
        const isDuplicate = myBookedSlots.some(slot =>
            isSameDay(new Date(slot.date), selectedDate) &&
            slot.startTime === selectedStartTime &&
            slot.endTime === selectedEndTime
        );

        if (isDuplicate) {
            setPopupMessage('This time slot is already booked.');
            setPopupType('error');
            setPopup(true);
            setTimeout(() => setPopup(false), delay);
            return;
        }

        const updatedMyBookings = [...myBookedSlots, { ...newBooking, date: new Date(newBooking.date) }];

        try {
            localStorage.setItem('bookedSlots', JSON.stringify(updatedMyBookings.map(b => ({
                ...b,
                date: new Date(b.date).toISOString()
            }))));
            setMyBookedSlots(updatedMyBookings);
            setPopupMessage(`Booking confirmed for ${format(selectedDate, 'MMMM d, yyyy')} from ${selectedStartTime} to ${selectedEndTime}`);
            setPopupType('success');
        } catch (error) {
            setPopupMessage('Failed to save booking. Please try again.');
            setPopupType('error');
        }

        setPopup(true);
        setTimeout(() => setPopup(false), delay);
        setIsActionModalOpen(false);
        resetSelection();
    };

    const handleSelectBookingForCancellation = (slotToCancel) => {
        setSelectedDate(new Date(slotToCancel.date));
        setSelectedStartTime(slotToCancel.startTime);
        setSelectedEndTime(slotToCancel.endTime);
        setActionModalType('delete');
        setIsActionModalOpen(true);
    };

    const handleDeleteBooking = () => {
        if (!selectedDate || !selectedStartTime || !selectedEndTime) {
            setPopupMessage('Invalid booking details. Cannot delete.');
            setPopupType('error');
            setPopup(true);
            setTimeout(() => setPopup(false), delay);
            return;
        }

        const bookingsAfterDeletion = myBookedSlots.filter(
            slot => !(isSameDay(new Date(slot.date), selectedDate) &&
                slot.startTime === selectedStartTime &&
                slot.endTime === selectedEndTime)
        );

        if (bookingsAfterDeletion.length === myBookedSlots.length) {
            setPopupMessage('Booking not found or already deleted.');
            setPopupType('error');
            setPopup(true);
            setTimeout(() => setPopup(false), delay);
            return;
        }

        try {
            localStorage.setItem('bookedSlots', JSON.stringify(bookingsAfterDeletion.map(b => ({
                ...b,
                date: new Date(b.date).toISOString()
            }))));
            setMyBookedSlots(bookingsAfterDeletion);
            setPopupMessage(`Booking cancelled for ${format(selectedDate, 'MMMM d, yyyy')} at ${selectedStartTime}`);
            setPopupType('success');
        } catch (error) {
            setPopupMessage('Failed to update bookings. Please try again.');
            setPopupType('error');
        }

        setPopup(true);
        setTimeout(() => setPopup(false), delay);
        setIsActionModalOpen(false);
        resetSelection();
    };

    const resetSelection = () => {
        setSelectedDate(null);
        setSelectedStartTime('');
        setSelectedEndTime('');
    };

    const handleTimeSelectorOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            setIsTimeSelectorOpen(false);
        }
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
                    myBookedSlots={myBookedSlots}
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
