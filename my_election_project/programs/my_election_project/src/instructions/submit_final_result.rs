use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;
use crate::instructions::verify_signature;

#[derive(Accounts)]
pub struct SubmitFinalResult<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>, // Election account
    #[account(mut, signer)]
    pub user: Signer<'info>, // VA must sign
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn submit_final_result(ctx: Context<SubmitFinalResult>,
    yes_votes: u64,
    no_votes: u64,
) -> Result<()> {
    let election = &mut ctx.accounts.election;

    require!(!election.is_active, ErrorCode::ElectionStillActive);

    // Ensure only the VA (admin) can reveal results
    require!(
        election.voting_authority == *ctx.accounts.user.key,
        ErrorCode::Unauthorized
    );

    // Construct the signed message
    let election_id = election.election_id.as_bytes();
    let yes_bytes = yes_votes.to_le_bytes();
    let no_bytes = no_votes.to_le_bytes();
    let message = [election_id, &yes_bytes, &no_bytes].concat();

    // Verify VA's signature
    verify_signature(&ctx.accounts.instructions_sysvar, &election.voting_authority, &message)?;

    // Store final vote counts
    election.yes_votes = yes_votes;
    election.no_votes = no_votes;

    Ok(())
}