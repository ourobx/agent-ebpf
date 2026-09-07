from setuptools import setup, find_packages

setup(
    name="ksec-mcp",
    version="2.0.0",
    description="Deterministic Ring-0 eBPF LSM Security Middleware for FastMCP & Autonomous AI Agents",
    long_description=open("README.md", "r", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="KSEC Sovereign Engineering",
    author_email="pilot@ksec.space",
    url="https://ksec.space",
    packages=find_packages(),
    install_requires=[
        "pydantic>=2.0.0",
        "pyyaml>=6.0",
        "httpx>=0.24.0"
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: POSIX :: Linux",
        "Topic :: Security",
    ],
    python_requires=">=3.9",
)
