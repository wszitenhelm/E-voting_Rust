use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::verify_certificate::verify_certificate;
use crate::verify_voter_signature::verify_voter_signature;
use crate::{VerifyVoterSignature, VerifyVoterSignatureBumps};
use crate::errors::ErrorCode;

// Define an event to be emitted when the vote is committed successfully
#[event]
pub struct VoteCommitted {
    pub voter: Pubkey,
    pub vote_stake: u64,
    pub message: String,
}


#[derive(Accounts)]
pub struct CommitVote<'info> {
    #[account(mut)]
    pub voter_pda: Account<'info, Voter>, // Voter account (to store the commitment)
    #[account(mut)]
    pub election: Account<'info, Election>, // Election account to access election ID and authority
    #[account(mut, signer)]
    pub user: Signer<'info>,
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>, // System instruction data for verifying signatures
}

pub fn commit_vote(ctx: Context<CommitVote>, commitment: Vec<u8>, certificate: Vec<u8>) -> Result<()> {
    let voter = &mut ctx.accounts.voter_pda;
    let election = &ctx.accounts.election;
    let user = &ctx.accounts.user;

    let voter_commiment = &commitment;
    let voting_authority = ctx.accounts.election.voting_authority; // Immutable borrow

    require!(election.is_active, ErrorCode::VotingNotActive);

    //let expected_signer = voting_authority;

    // VERIFY CERTIFICATE
    let mut expected_message = Vec::new();
    
    // Encode the public key in Base58 (like in JavaScript)
    let pubkey_bs58 = bs58::encode(voter.voter_address.to_bytes()).into_string();
    expected_message.extend_from_slice(pubkey_bs58.as_bytes());
    
    // Append "-" separator
    expected_message.extend_from_slice(b"-");
    
    // DOUBLE the stake
    
    let doubled_stake = match voter.voter_stake.checked_mul(2) {
        Some(stake) => stake,
        None => return Err(ErrorCode::Overflow.into()),
    };

    // Convert doubled stake to string and append
    let stake_str = doubled_stake.to_string();
    expected_message.extend_from_slice(stake_str.as_bytes());
    
    // Append "-" separator
    expected_message.extend_from_slice(b"-");
    
    // Append election ID
    expected_message.extend_from_slice(election.election_id.as_bytes());

    // msg!("PRINING IN COMMIT VOTE");
    // msg!("voting authority {:?}", voting_authority);
    // msg!("expected message {:?}", expected_message);
    
    verify_certificate(&voting_authority, &expected_message, certificate)?;


    // VERIFY SIGNED COMMITMENT 

    // Call the verify_signature function to check if Voter signed the hash
    // and called Ed25519SigVerify before
    let expected_signer_voter = voter.voter_address;

    // Construct a new context correctly
    
    verify_voter_signature(
            Context::new(&crate::ID, &mut VerifyVoterSignature {
                instructions: ctx.accounts.instructions_sysvar.clone(),
            }, &[], VerifyVoterSignatureBumps::default()),
            &expected_signer_voter,
            &commitment
    )?;


    // Step 3: Update the Voter account with the commitment and other fields
    voter.commitment = voter_commiment.to_vec();
    voter.has_committed = true; // Mark that the voter has committed their vote

    
    // Define message for the event
    let message = format!("Vote committed successfully for voter: {:?}", user.key());

    // Emit the event
    emit!(VoteCommitted {
        voter: voter.key(),
        vote_stake: doubled_stake, // Use the doubled stake here
        message,
    });



    msg!("Vote committed successfully for voter: {:?}", user.key());
    Ok(())
}
