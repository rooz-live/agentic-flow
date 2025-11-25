import argparse
import sys

# Monkey-patch argparse to allow unknown args
original_parse_args = argparse.ArgumentParser.parse_args

def parse_known_args_wrapper(self, args=None, namespace=None):
    return self.parse_known_args(args, namespace)[0]

argparse.ArgumentParser.parse_args = parse_known_args_wrapper
