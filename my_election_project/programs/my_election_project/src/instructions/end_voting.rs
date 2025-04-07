use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct EndVoting<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
}

pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
    let election = &mut ctx.accounts.election;

    if !election.is_active {
        return Err(ErrorCode::VotingNotActive.into());
    }

    // Ensure only the admin can end the election
    if election.admin != *ctx.accounts.user.key {
        return Err(ErrorCode::Unauthorized.into());
    }

    election.is_active = false;
    election.votes_committed = true;

    msg!("Election ended successfully.");
    Ok(())
}