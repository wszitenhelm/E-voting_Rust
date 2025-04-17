use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, seeds = [b"election", user.key().as_ref()], bump, payer = user, space = 8 + 4 + 64 + 4 + 64 + 1 + 1 + 1 + 32 + 32 + 8 + 8)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>, election_name: String, voting_authority: Pubkey, election_id: String, commit_duration: u64,
    reveal_duration: u64) -> Result<()> {
    let election = &mut ctx.accounts.election;

    // Ensure valid durations
    require!(commit_duration > 0, ErrorCode::InvalidCommitDuration);
    require!(reveal_duration > 0, ErrorCode::InvalidRevealDuration);

    // Initialize election data
    election.commit_duration = commit_duration;
    election.reveal_duration = reveal_duration;
    election.commit_end_time = None; // Not set yet
    election.reveal_end_time = None; // Not set yet

    election.name = election_name;
    election.is_active = false;
    election.votes_committed = false;
    election.votes_revealed = false;
    election.admin = *ctx.accounts.user.key;
    election.voting_authority = voting_authority;
    election.election_id = election_id;
    election.va_encryption_key = Pubkey::default();
    election.va_decryption_key = Some(String::new());
    election.yes_votes = 0;
    election.no_votes = 0;
    Ok(())
}