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

// Hero Image Slider
(function() {
  const slides = document.querySelectorAll('.hero-slide');
  const leftArrow = document.querySelector('.hero-slider-arrow.left');
  const rightArrow = document.querySelector('.hero-slider-arrow.right');
  let current = 0;
  function showSlide(idx) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === idx);
    });
  }
  if (leftArrow && rightArrow && slides.length > 1) {
    leftArrow.addEventListener('click', function() {
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
    });
    rightArrow.addEventListener('click', function() {
      current = (current + 1) % slides.length;
      showSlide(current);
    });
  }
})();

// Modern Hero Slider
(function() {
  const slider = document.querySelector('.modern-slider .slider');
  const slides = document.querySelectorAll('.modern-slider .slide');
  const prevBtn = document.querySelector('.modern-slider .slider-btn.prev');
  const nextBtn = document.querySelector('.modern-slider .slider-btn.next');
  const dotsContainer = document.querySelector('.modern-slider .slider-dots');
  let current = 0;
  let interval;

  if (!slider || slides.length === 0 || !prevBtn || !nextBtn || !dotsContainer) return;

  // Create dots
  function createDots() {
    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });
  }

  function updateDots() {
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function goToSlide(idx) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === idx);
      slide.style.transform = `translateX(${(i-idx)*100}%)`;
    });
    current = idx;
    updateDots();
  }

  function nextSlide() {
    goToSlide((current + 1) % slides.length);
  }
  function prevSlide() {
    goToSlide((current - 1 + slides.length) % slides.length);
  }

  function startAutoSlide() {
    interval = setInterval(nextSlide, 5000);
  }
  function stopAutoSlide() {
    clearInterval(interval);
  }

  // Initial setup
  slides.forEach((slide, i) => {
    slide.style.transform = `translateX(${i*100}%)`;
  });
  createDots();
  startAutoSlide();

  // Event listeners
  nextBtn.addEventListener('click', () => {
    stopAutoSlide();
    nextSlide();
    startAutoSlide();
  });
  prevBtn.addEventListener('click', () => {
    stopAutoSlide();
    prevSlide();
    startAutoSlide();
  });
  slider.addEventListener('mouseenter', stopAutoSlide);
  slider.addEventListener('mouseleave', startAutoSlide);
})();

// Hero Background Slide-in Transition
(function() {
  const images = ['pole.jpg', 'background.jpg', 'tools.jpg'];
  let current = 0;
  let intervalId;
  const heroSlider = document.querySelector('.hero-bg-slider');
  if (!heroSlider) return;
  const slides = heroSlider.querySelectorAll('.hero-bg-slide');
  if (slides.length < 2) return;
  const leftBtn = heroSlider.querySelector('.hero-bg-arrow.left');
  const rightBtn = heroSlider.querySelector('.hero-bg-arrow.right');
  const dots = heroSlider.querySelectorAll('.hero-bg-dot');

  function updateDots(next) {
    dots.forEach((dot, i) => {
      if (i === next) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function showSlide(next) {
    const activeSlide = slides[current % 2];
    const nextSlide = slides[next % 2];
    nextSlide.style.backgroundImage = `linear-gradient(120deg, rgba(28,28,28,0.7) 60%, rgba(42,42,42,0.7) 100%), url('${images[next]}')`;
    nextSlide.classList.add('active');
    nextSlide.classList.remove('prev');
    activeSlide.classList.remove('active');
    activeSlide.classList.add('prev');
    setTimeout(() => {
      activeSlide.classList.remove('prev');
    }, 700);
    current = next;
    updateDots(next);
  }

  // Initialize first slide and dots
  slides[0].style.backgroundImage = `linear-gradient(120deg, rgba(28,28,28,0.7) 60%, rgba(42,42,42,0.7) 100%), url('${images[0]}')`;
  slides[0].classList.add('active');
  slides[1].classList.remove('active', 'prev');
  updateDots(0);

  function nextSlide() {
    showSlide((current + 1) % images.length);
  }
  function prevSlide() {
    showSlide((current - 1 + images.length) % images.length);
  }
  function resetInterval() {
    clearInterval(intervalId);
    intervalId = setInterval(nextSlide, 4000);
  }

  intervalId = setInterval(nextSlide, 4000);

  if (rightBtn) {
    rightBtn.addEventListener('click', () => {
      nextSlide();
      resetInterval();
    });
  }
  if (leftBtn) {
    leftBtn.addEventListener('click', () => {
      prevSlide();
      resetInterval();
    });
  }
  if (dots.length) {
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        showSlide(i);
        resetInterval();
      });
    });
  }
})();

// Admin dashboard logic
if (document.getElementById('admin-dashboard-section')) {
  const bookingsTableBody = document.querySelector('#bookings-table tbody');
  const filterStart = document.getElementById('filter-start');
  const filterEnd = document.getElementById('filter-end');
  const filterBtn = document.getElementById('filter-btn');
  const clearFilterBtn = document.getElementById('clear-filter-btn');
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  // Login handler (session)
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      loginError.style.display = 'none';
      fetch(`${window.API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: document.getElementById('admin-username').value,
          password: document.getElementById('admin-password').value
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          showDashboard();
        } else {
          throw new Error(data.error || 'Login failed');
        }
      })
      .catch(err => {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
      });
    });
  }

  // Logout handler (session)
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      fetch(`${window.API_BASE_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include'
      }).then(() => {
        showLogin();
      });
    });
  }

  async function fetchBookings(start, end) {
    let url = `${window.API_BASE_URL}/api/admin/bookings`;
    const params = [];
    if (start) params.push(`start=${encodeURIComponent(start)}`);
    if (end) params.push(`end=${encodeURIComponent(end)}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      renderBookings(data.bookings);
    } else {
      bookingsTableBody.innerHTML = `<tr><td colspan='10'>Failed to load bookings</td></tr>`;
    }
  }

  // Modal elements
  const bookingModal = document.getElementById('booking-modal');
  const closeBookingModalBtn = document.getElementById('close-booking-modal');
  const editBookingForm = document.getElementById('edit-booking-form');
  const modalBookingId = document.getElementById('modal-booking-id');
  const modalName = document.getElementById('modal-name');
  const modalEmail = document.getElementById('modal-email');
  const modalPhone = document.getElementById('modal-phone');
  const modalService = document.getElementById('modal-service');
  const modalPrice = document.getElementById('modal-price');
  const modalDate = document.getElementById('modal-date');
  const modalTime = document.getElementById('modal-time');
  const modalMessage = document.getElementById('modal-message');
  const modalTitle = document.getElementById('modal-title');

  function openBookingModal(booking, editable) {
    bookingModal.style.display = 'flex';
    modalBookingId.value = booking.id;
    modalName.value = booking.name;
    modalEmail.value = booking.email;
    modalPhone.value = booking.phone;
    modalService.value = booking.service;
    modalPrice.value = booking.price;
    modalDate.value = booking.date;
    modalTime.value = booking.time;
    modalMessage.value = booking.message || '';
    modalTitle.textContent = editable ? 'Edit Booking' : 'Booking Details';
    // Enable/disable fields
    [modalName, modalEmail, modalPhone, modalService, modalPrice, modalDate, modalTime, modalMessage].forEach(input => {
      input.disabled = !editable;
    });
    document.getElementById('save-booking-btn').style.display = editable ? '' : 'none';
  }

  function closeBookingModal() {
    bookingModal.style.display = 'none';
  }

  if (closeBookingModalBtn) closeBookingModalBtn.onclick = closeBookingModal;
  if (bookingModal) bookingModal.onclick = function(e) { if (e.target === bookingModal) closeBookingModal(); };

  // Handle edit form submit
  if (editBookingForm) {
    editBookingForm.onsubmit = async function(e) {
      e.preventDefault();
      const id = modalBookingId.value;
      const updated = {
        name: modalName.value,
        email: modalEmail.value,
        phone: modalPhone.value,
        service: modalService.value,
        price: modalPrice.value,
        date: modalDate.value,
        time: modalTime.value,
        message: modalMessage.value
      };
      const res = await fetch(`${window.API_BASE_URL}/api/admin/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        closeBookingModal();
        fetchBookings(filterStart.value, filterEnd.value);
      } else {
        alert('Failed to update booking');
      }
    };
  }

  // Enhance renderBookings to add view/edit handlers
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
        <td>
          <button class="view-btn" data-id="${b.id}">View</button>
          <button class="edit-btn" data-id="${b.id}">Edit</button>
          <button class="delete-btn" data-id="${b.id}">Delete</button>
        </td>
      </tr>
    `).join('');
    // Attach view/edit/delete handlers
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = btn.getAttribute('data-id');
        const booking = bookings.find(b => b.id == id);
        openBookingModal(booking, false);
      });
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = btn.getAttribute('data-id');
        const booking = bookings.find(b => b.id == id);
        openBookingModal(booking, true);
      });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete this booking?')) {
          const id = btn.getAttribute('data-id');
          const res = await fetch(`${window.API_BASE_URL}/api/admin/bookings/${id}`, {
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

// Scroll-triggered slide-in animation
function handleSlideInOnScroll() {
  const slideEls = document.querySelectorAll('.slide-in');
  const triggerBottom = window.innerHeight * 0.95;
  slideEls.forEach(el => {
    const boxTop = el.getBoundingClientRect().top;
    if (boxTop < triggerBottom) {
      el.classList.add('slide-in-visible');
    } else {
      el.classList.remove('slide-in-visible');
    }
  });
}

window.addEventListener('scroll', handleSlideInOnScroll);
window.addEventListener('DOMContentLoaded', handleSlideInOnScroll);
