const express = require('express');
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Gate: only active organizers may post/edit events
const requireActiveOrganizer = (req, res, next) => {
  if (req.user.role !== 'organizer') {
    return res.status(403).json({ message: 'Only organizers can post events. Upgrade your account to post.' });
  }
  if (req.user.subscriptionStatus !== 'active') {
    return res.status(402).json({ message: 'An active organizer subscription is required to post events.' });
  }
  next();
};

// GET /api/events — get all published events
router.get('/', async (req, res) => {
  try {
    const { month, year, category } = req.query;
    const filter = { isPublished: true };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    if (category && category !== 'all') filter.category = category;

    const { neighborhood } = req.query;
    if (neighborhood && neighborhood !== 'all') filter.neighborhood = neighborhood;

    const { isFree } = req.query;
    if (isFree === 'true')  filter.isFree = true;
    if (isFree === 'false') filter.isFree = false;

    const { upcoming } = req.query;
    if (upcoming === 'true') {
      const now = new Date();
      filter.$or = [
        { date: { ...filter.date, $gte: now } },
        { endDate: { $gte: now } },
      ];
      delete filter.date;
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name email')
      .sort({ date: 1 });

    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ⚠️ /user/* routes MUST come before /:id
// GET /api/events/user/my-events
router.get('/user/my-events', protect, async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .populate('organizer', 'name email')
      .sort({ date: 1 });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/events/user/registered
router.get('/user/registered', protect, async (req, res) => {
  try {
    const events = await Event.find({ 'attendees.user': req.user._id })
      .populate('organizer', 'name email')
      .sort({ date: 1 });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('attendees.user', 'name email');

    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/events
router.post('/', protect, requireActiveOrganizer, async (req, res) => {
  try {
    const { title, description, date, endDate, location, category, neighborhood, venueSubarea, capacity, isFree, ticketPrice, imageUrl, rsvpUrl } = req.body;

    const event = await Event.create({
      title, description, date, endDate, location, category,
      neighborhood: neighborhood,
      venueSubarea: venueSubarea || '',
      capacity, imageUrl, rsvpUrl: rsvpUrl || '',
      isFree: isFree !== false,
      ticketPrice: isFree !== false ? null : (ticketPrice ?? null),
      organizer: req.user._id,
    });

    await event.populate('organizer', 'name email');
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/events/:id
router.put('/:id', protect, requireActiveOrganizer, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const { title, description, date, endDate, location, category, neighborhood, venueSubarea, capacity, isFree, ticketPrice, imageUrl, rsvpUrl } = req.body;
    Object.assign(event, {
      title, description, date, endDate, location, category,
      neighborhood: neighborhood,
      venueSubarea: venueSubarea || '',
      capacity, imageUrl, rsvpUrl: rsvpUrl || '',
      isFree: isFree !== false,
      ticketPrice: isFree !== false ? null : (ticketPrice ?? null),
    });
    await event.save();
    await event.populate('organizer', 'name email');

    res.json({ message: 'Event updated', event });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await event.deleteOne();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/events/:id/register
router.post('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const alreadyRegistered = event.attendees.some(
      (a) => a.user.toString() === req.user._id.toString()
    );
    if (alreadyRegistered) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    if (event.capacity && event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: 'Event is at full capacity' });
    }

    event.attendees.push({ user: req.user._id });
    await event.save();

    res.json({ message: 'Successfully registered for event', event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/events/:id/register
router.delete('/:id/register', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.attendees = event.attendees.filter(
      (a) => a.user.toString() !== req.user._id.toString()
    );
    await event.save();

    res.json({ message: 'Registration cancelled', event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;