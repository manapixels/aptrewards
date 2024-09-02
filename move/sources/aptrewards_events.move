module AptRewards::AptRewardsEvents {
    use aptos_framework::event::{EventHandle, emit_event};

    struct LoyaltyProgramCreated has store {
        program_id: u64,
        owner: address,
    }

    struct OwnershipTransferred has store {
        program_id: u64,
        old_owner: address,
        new_owner: address,
    }

    struct SpinProbabilitiesSet has store {
        program_id: u64,
    }

    struct CouponCreated has store {
        program_id: u64,
        coupon_id: u64,
    }

    struct TierThresholdsSet has store {
        program_id: u64,
    }

    struct StampsEarned has store {
        program_id: u64,
        customer: address,
        amount: u64,
    }

    struct CouponRedeemed has store {
        program_id: u64,
        customer: address,
        coupon_id: u64,
    }

    struct LuckySpinResult has store {
        program_id: u64,
        customer: address,
        winning_amount: u64,
    }

    public fun emit_loyalty_program_created(handle: &EventHandle<LoyaltyProgramCreated>, program_id: u64, owner: address) {
        emit_event(handle, LoyaltyProgramCreated { program_id, owner });
    }

    public fun emit_ownership_transferred(handle: &EventHandle<OwnershipTransferred>, program_id: u64, old_owner: address, new_owner: address) {
        emit_event(handle, OwnershipTransferred { program_id, old_owner, new_owner });
    }

    public fun emit_spin_probabilities_set(handle: &EventHandle<SpinProbabilitiesSet>, program_id: u64) {
        emit_event(handle, SpinProbabilitiesSet { program_id });
    }

    public fun emit_coupon_created(handle: &EventHandle<CouponCreated>, program_id: u64, coupon_id: u64) {
        emit_event(handle, CouponCreated { program_id, coupon_id });
    }

    public fun emit_tier_thresholds_set(handle: &EventHandle<TierThresholdsSet>, program_id: u64) {
        emit_event(handle, TierThresholdsSet { program_id });
    }

    public fun emit_stamps_earned(handle: &EventHandle<StampsEarned>, program_id: u64, customer: address, amount: u64) {
        emit_event(handle, StampsEarned { program_id, customer, amount });
    }

    public fun emit_coupon_redeemed(handle: &EventHandle<CouponRedeemed>, program_id: u64, customer: address, coupon_id: u64) {
        emit_event(handle, CouponRedeemed { program_id, customer, coupon_id });
    }

    public fun emit_lucky_spin_result(handle: &EventHandle<LuckySpinResult>, program_id: u64, customer: address, winning_amount: u64) {
        emit_event(handle, LuckySpinResult { program_id, customer, winning_amount });
    }
}