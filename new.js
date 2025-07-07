// Responsive Navigation & Dropdown
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const dropdownToggle = document.querySelector('.dropdown-toggle');
const dropdownMenu = document.querySelector('.dropdown-menu');

if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });
}

if (dropdownToggle && dropdownMenu) {
  dropdownToggle.addEventListener('click', (e) => {
    e.preventDefault();
    dropdownMenu.classList.toggle('active');
  });
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('active');
    }
  });
}

// Contact Form Validation
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    if (!name || !email || !message) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      const response = await fetch('https://king-taper-production.up.railway.app/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Booking successfully sent!');
        contactForm.reset();
      } else {
        alert(data.error || 'Failed to send booking. Please try again later.');
      }
    } catch (error) {
      alert('Failed to send booking. Please check your connection and try again.');
    }
  });
}

// Service Booking Modal Logic
const bookingModal = document.getElementById('bookingModal');
const modalServiceName = document.getElementById('modalServiceName');
const modalServicePrice = document.getElementById('modalServicePrice');
const modalClose = document.querySelector('.modal-close');
const modalOverlay = document.querySelector('.modal-overlay');
const modalBookingForm = document.getElementById('modalBookingForm');
const modalSuccessMsg = document.getElementById('modalSuccessMsg');

function openBookingModal(service, price) {
  if (bookingModal) {
    modalServiceName.textContent = service;
    modalServicePrice.textContent = price ? `Price: AED ${price}` : '';
    bookingModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // Reset form and message
    if (modalBookingForm) modalBookingForm.style.display = '';
    if (modalSuccessMsg) modalSuccessMsg.style.display = 'none';
    modalBookingForm.reset();
  }
}
function closeBookingModal() {
  if (bookingModal) {
    bookingModal.style.display = 'none';
    document.body.style.overflow = '';
  }
}
// Open modal on Book Now
const bookBtns = document.querySelectorAll('.book-service');
bookBtns.forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    const service = btn.getAttribute('data-service') || 'Book Service';
    const price = btn.getAttribute('data-price') || '';
    openBookingModal(service, price);
  });
});
// Close modal
if (modalClose) modalClose.addEventListener('click', closeBookingModal);
if (modalOverlay) modalOverlay.addEventListener('click', closeBookingModal);
// Handle booking form
if (modalBookingForm) {
  modalBookingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // You can add more validation here
    modalBookingForm.style.display = 'none';
    modalSuccessMsg.style.display = 'block';
    setTimeout(closeBookingModal, 1800);
  });
}
// Close modal on Esc key
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeBookingModal();
});

document.addEventListener('DOMContentLoaded', function() {
  function revealOnScroll() {
    var elements = document.querySelectorAll('.slide-in');
    var windowHeight = window.innerHeight;
    elements.forEach(function(el) {
      var position = el.getBoundingClientRect().top;
      if (position < windowHeight - 60) {
        el.classList.add('slide-in-visible');
      }
    });
  }
  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll();
});

// Admin dashboard logic
if (document.getElementById('admin-dashboard-section')) {
  const bookingsTableBody = document.querySelector('#bookings-table tbody');
  const filterStart = document.getElementById('filter-start');
  const filterEnd = document.getElementById('filter-end');
  const filterBtn = document.getElementById('filter-btn');
  const clearFilterBtn = document.getElementById('clear-filter-btn');

  async function fetchBookings(start, end) {
    let url = '/api/admin/bookings';
    const params = [];
    if (start) params.push(`start=${encodeURIComponent(start)}`);
    if (end) params.push(`end=${encodeURIComponent(end)}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      renderBookings(data.bookings);
    } else {
      bookingsTableBody.innerHTML = `<tr><td colspan='11'>Failed to load bookings</td></tr>`;
    }
  }

  function renderBookings(bookings) {
    bookingsTableBody.innerHTML = bookings.map(b => `
      <tr>
        <td>${b.id}</td>
        <td>${b.name}</td>
        <td>${b.email}</td>
        <td>${b.phone}</td>
        <td>${b.service}</td>
        <td>${b.price}</td>
        <td>${b.date}</td>
        <td>${b.time}</td>
        <td>${b.message || ''}</td>
        <td>${b.created_at ? new Date(b.created_at).toLocaleString() : ''}</td>
        <td><button class="delete-btn" data-id="${b.id}">Delete</button></td>
      </tr>
    `).join('');
    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete this booking?')) {
          const id = btn.getAttribute('data-id');
          const res = await fetch(`/api/admin/bookings/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          const data = await res.json();
          if (data.success) {
            fetchBookings(filterStart.value, filterEnd.value);
          } else {
            alert('Failed to delete booking');
          }
        }
      });
    });
  }

  filterBtn.addEventListener('click', function() {
    fetchBookings(filterStart.value, filterEnd.value);
  });
  clearFilterBtn.addEventListener('click', function() {
    filterStart.value = '';
    filterEnd.value = '';
    fetchBookings();
  });

  // Initial load
  fetchBookings();
}
