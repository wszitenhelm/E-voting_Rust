use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct GetWinner<'info> {
    pub election: Account<'info, Election>, // Election account
}

pub fn get_winner(ctx: Context<GetWinner>) -> Result<u8> {
    let election = &ctx.accounts.election;

    require!(!election.is_active, ErrorCode::ElectionStillActive);

    let winner = if election.yes_votes > election.no_votes {
        1 // "Yes" won
    } else if election.no_votes > election.yes_votes {
        2 // "No" won
    } else {
        0 // Tie
    };

    Ok(winner)
}
