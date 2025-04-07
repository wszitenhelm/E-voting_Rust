use anchor_lang::prelude::*;
use crate::state::Election;

#[derive(Accounts)]
pub struct GetVotingAuthorityPublicKey<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
}

pub fn get_voting_authority_public_key(ctx: Context<GetVotingAuthorityPublicKey>) -> Result<Pubkey> {
    Ok(ctx.accounts.election.voting_authority) // copying as Pubkey implements Copy
}