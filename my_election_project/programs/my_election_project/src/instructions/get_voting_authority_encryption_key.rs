use anchor_lang::prelude::*;
use crate::state::Election;

#[derive(Accounts)]
pub struct GetVotingAuthorityEncryptionKey<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
}

pub fn get_voting_authority_encryption_key(ctx: Context<GetVotingAuthorityEncryptionKey>) -> Result<Pubkey> {
    Ok(ctx.accounts.election.va_encryption_key) // copying as Pubkey implements Copy
}