import express, { Request, Response } from 'express';
import Room from '../models/Room';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import Reservation from '../models/Reservation';
import { validateRoom } from '../middleware/validation';

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms with optional filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      available,
      date, // optional: compute availability state for this local date (YYYY-MM-DD)
      features,
      page = 1,
      limit = 10,
      sort = 'name'
    } = req.query;

    // Build filter object
    const filter: any = {};

    // Status now only reflects active/inactive; filter when available flag is set
    if (available !== undefined) filter.status = (available === 'true') ? 'active' : 'inactive';

    // Handle features filter
    if (features) {
      const featuresList = (features as string).split(',');
      featuresList.forEach(feature => {
        filter[`features.${feature}`] = true;
      });
    }

    // Build sort object
    const sortObj: any = {};
    if (sort === 'name') sortObj.name = 1;
    else sortObj.name = 1; // default

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const rooms = await Room.find(filter)
      .sort(sortObj)
      .limit(limitNum)
      .skip(skip)
      .lean();

    // If a date is provided, compute availability state for that date per room
    let roomsWithAvailability = rooms;
    if (date && typeof date === 'string') {
      const parseLocalDate = (s: string) => {
        const [y,m,d] = s.split('-').map(Number);
        return new Date(y, (m - 1), d, 0, 0, 0, 0);
      };
      const dayStart = parseLocalDate(date);
      // Occupancy condition: checkInDate <= dayStart AND checkOutDate > dayStart
      const reservations = await Reservation.find({
        type: 'room',
        room: { $ne: null },
        status: { $in: ['pending', 'confirmed', 'completed'] },
        checkInDate: { $lte: dayStart },
        checkOutDate: { $gt: dayStart },
      }).select('room actualCheckInAt').lean();
      const byRoom = new Map<string, any>();
      for (const r of reservations as any[]) {
        const roomId = String(r.room);
        byRoom.set(roomId, r);
      }
      roomsWithAvailability = rooms.map(r => {
        const inactive = r.status === 'inactive';
        let availability: 'not_available' | 'available' | 'booked' | 'occupied' = 'available';
        if (inactive) availability = 'not_available';
        else if (byRoom.has(String(r._id))) {
          const rr = byRoom.get(String(r._id));
          availability = rr.actualCheckInAt ? 'occupied' : 'booked';
        }
        return { ...r, availability } as any;
      });
    }

    const total = await Room.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: roomsWithAvailability,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRooms: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching rooms'
    });
  }
});

// Additional endpoint: list all active rooms available for a given date range
// @route   GET /api/rooms/available
// @desc    Get active rooms with no overlapping reservations in [checkIn, checkOut)
// @access  Public
router.get('/available', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query as { checkIn?: string; checkOut?: string };
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Check-in and check-out dates are required' });
    }
    const parseLocalDate = (s: string) => {
      const [y,m,d] = s.split('-').map(Number);
      return new Date(y, (m - 1), d, 0, 0, 0, 0);
    };
    const start = parseLocalDate(checkIn);
    const end = parseLocalDate(checkOut);
    // Get active rooms only
    const rooms = await Room.find({ status: 'active' }).lean();
    const roomIds = rooms.map(r => r._id);
    // Find overlapping reservations for these rooms
    const overlaps = await Reservation.find({
      type: 'room',
      room: { $in: roomIds },
      status: { $in: ['pending', 'confirmed', 'completed'] },
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start },
    }).select('room').lean();
    const busySet = new Set(overlaps.map((r: any) => String(r.room)));
    const availableRooms = rooms.filter(r => !busySet.has(String(r._id)));
    res.status(200).json({ success: true, data: availableRooms });
  } catch (error: any) {
    console.error('List available rooms error:', error);
    res.status(500).json({ success: false, message: 'Server error while listing available rooms' });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get single room by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room'
    });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private (Admin only)
router.post('/', authenticate, authorize('admin'), validateRoom, async (req: Request, res: Response) => {
  try {
    const room = new Room(req.body);
    await room.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating room'
    });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update a room
// @access  Private (Admin only)
router.put('/:id', authenticate, authorize('admin'), validateRoom, async (req: Request, res: Response) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating room'
    });
  }
});

// Lightweight operational update for housekeeping fields
// @route   PATCH /api/rooms/:id/ops
// @desc    Update status, condition, and comment only
// @access  Private (Admin or Maintenance)
router.patch('/:id/ops', authenticate, authorize('admin', 'maintenance'), async (req: Request, res: Response) => {
  try {
    const { status, condition, comment } = req.body as {
      status?: 'active' | 'inactive';
      condition?: 'pending_cleanup' | 'clean';
      comment?: string;
    };

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (status !== undefined) {
      room.status = status;
    }
    if (condition !== undefined) {
      room.condition = condition;
    }
    if (comment !== undefined) {
      room.comment = String(comment).slice(0, 500);
    }

    await room.save();
    res.status(200).json({ success: true, message: 'Room updated', data: room });
  } catch (error: any) {
    console.error('Ops update error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating room' });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete a room
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting room'
    });
  }
});

// @route   GET /api/rooms/:id/availability
// @desc    Check room availability for specific dates
// @access  Public
router.get('/:id/availability', async (req, res) => {
  try {
    const { checkIn, checkOut, date } = req.query as { checkIn?: string; checkOut?: string; date?: string };

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    // Inactive rooms are not available
    if (room.status === 'inactive') {
      return res.status(200).json({ success: true, available: false, reason: 'Room inactive' });
    }

    const parseLocalDate = (s: string) => {
      const [y,m,d] = s.split('-').map(Number);
      return new Date(y, (m - 1), d, 0, 0, 0, 0);
    };

    if (date && typeof date === 'string') {
      const dayStart = parseLocalDate(date);
      const overlapping = await Reservation.findOne({
        type: 'room',
        room: room._id,
        status: { $in: ['pending', 'confirmed', 'completed'] },
        checkInDate: { $lte: dayStart },
        checkOutDate: { $gt: dayStart },
      }).select('actualCheckInAt').lean();
      const available = !overlapping;
      return res.status(200).json({ success: true, available });
    }

    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Check-in and check-out dates are required' });
    }

    const start = parseLocalDate(checkIn as string);
    const end = parseLocalDate(checkOut as string);
    // Find any overlapping reservation in [start, end) range
    const overlapping = await Reservation.findOne({
      type: 'room',
      room: room._id,
      status: { $in: ['pending', 'confirmed', 'completed'] },
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start },
    }).lean();
    const available = !overlapping;
    return res.status(200).json({ success: true, available });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking availability'
    });
  }
});

export default router;
