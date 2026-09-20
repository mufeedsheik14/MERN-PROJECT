const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User schema mirrors the frontend AuthContext / mockData.js user model exactly,
 * covering customers, staff, and admin accounts.
 */
const userSchema = new mongoose.Schema(
  {
    // ── Core credentials ─────────────────────────────────────
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },

    password: {
      type: String,
      default: null,  // null for Google OAuth accounts
      select: false,  // never returned in queries unless explicitly selected
    },

    // ── Role & status ─────────────────────────────────────────
    role: {
      type: String,
      enum: ['admin', 'staff', 'customer'],
      default: 'customer',
    },

    active: {
      type: Boolean,
      default: true,
    },

    // ── Personal info ─────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be at most 100 characters'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^(\d{10})?$/, 'Phone must be a 10-digit number or empty'],
    },

    // ── Staff-specific ────────────────────────────────────────
    // Mirrors mockData MOCK_USERS int_Branch_Id field
    int_Branch_Id: {
      type: Number,
      default: null,
    },
    employeeId: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: '',
      match: [/^(\d{10})?$/, 'Emergency contact phone must be 10 digits or empty'],
    },
    accountStatus: {
      type: String,
      enum: ['Active', 'Pending Approval', 'Deactivated'],
      default: 'Active',
    },

    // ── Address fields (customer profile page) ────────────────
    address: { type: String, trim: true, default: '' },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: {
      type: String,
      trim: true,
      default: '',
      match: [/^(\d{6})?$/, 'Pincode must be 6 digits or empty'],
    },
    country: { type: String, trim: true, default: 'India' },

    // ── Google OAuth ──────────────────────────────────────────
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    googleId: { type: String, default: null },
    avatar: { type: String, default: '' },
  },
  {
    timestamps: true, // adds createdAt / updatedAt automatically
  }
);

// ── Indexes ───────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ employeeId: 1 });

// ── Pre-save hook: hash password before storing & sync status ──
userSchema.pre('save', async function (next) {
  // Sync active boolean and accountStatus if one changed
  if (this.isModified('accountStatus')) {
    this.active = this.accountStatus === 'Active';
  } else if (this.isModified('active')) {
    this.accountStatus = this.active ? 'Active' : 'Deactivated';
  }

  // Only hash if the password field was modified (or is new)
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plain password with stored hash ──
userSchema.methods.matchPassword = async function (plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

// ── Helper: build safe session object (no password) ───────────
userSchema.methods.toSessionObject = function () {
  return {
    _id: this._id,
    username: this.username,
    name: this.name,
    role: this.role,
    email: this.email,
    phone: this.phone,
    int_Branch_Id: this.int_Branch_Id,
    employeeId: this.employeeId || '',
    dateOfBirth: this.dateOfBirth || '',
    emergencyContactName: this.emergencyContactName || '',
    emergencyContactPhone: this.emergencyContactPhone || '',
    accountStatus: this.accountStatus || (this.active ? 'Active' : 'Deactivated'),
    address: this.address,
    addressLine2: this.addressLine2,
    city: this.city,
    state: this.state,
    pincode: this.pincode,
    country: this.country,
    active: this.active,
    authProvider: this.authProvider,
    avatar: this.avatar,
  };
};

module.exports = mongoose.model('User', userSchema);
