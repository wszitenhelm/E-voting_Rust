#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

pub use instructions::*;
pub use state::*;
pub use errors::*;

declare_id!("3QcquCXtnJeVNGtiMsjoMXh7TnFyMX4MMVRekdpdXzVS"); // Replace with actual program ID

#[program]
pub mod voting_system {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, election_name: String, voting_authority: Pubkey, election_id: String, commit_duration: u64,
        reveal_duration: u64) -> Result<()> {
        instructions::initialize::initialize(ctx, election_name, voting_authority, election_id, commit_duration, reveal_duration)
    }

    pub fn register_voter(ctx: Context<RegisterVoter>, voter_public_key: Pubkey, voter_stake: u64) -> Result<()> {
        instructions::register_voter::register_voter(ctx, voter_public_key, voter_stake)
    }

    pub fn start_election(ctx: Context<StartElection>) -> Result<()> {
        instructions::start_election::start_election(ctx)
    }

    pub fn commit_vote(ctx: Context<CommitVote>, commitment: Vec<u8>, certificate: Vec<u8>,) -> Result<()> {
        instructions::commit_vote::commit_vote(ctx, commitment, certificate)
    }

    pub fn reveal_vote(ctx: Context<RevealVote>, encrypted_vote: Vec<u8>, nonce: Vec<u8>) -> Result<()> {
        instructions::reveal_vote::reveal_vote(ctx, encrypted_vote, nonce)
    }

    pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
        instructions::end_voting::end_voting(ctx)
    }

    pub fn get_election_id(ctx: Context<GetElectionId>) -> Result<String> {
        instructions::get_election_id::get_election_id(ctx)
    }

    pub fn get_voting_authority_encryption_key(ctx: Context<GetVotingAuthorityEncryptionKey>) -> Result<Pubkey> {
        instructions::get_voting_authority_encryption_key::get_voting_authority_encryption_key(ctx)
    }

    pub fn submit_final_result(ctx: Context<SubmitFinalResult>, yes_votes: u64, no_votes: u64) -> Result<()> {
        instructions::submit_final_result::submit_final_result(ctx, yes_votes, no_votes)
    }

    pub fn get_winner(ctx: Context<GetWinner>) -> Result<u8> {
        instructions::get_winner::get_winner(ctx)
    }
}